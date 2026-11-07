import { Router } from "express";
import { toDocumentDto } from "../dto.js";
import { requireAuth, userIdOf } from "../middleware/auth.js";
import { AuthService } from "../services/AuthService.js";
import { SseHub } from "../sse-hub.js";
import { AppError } from "../utils/error.js";
import { DocumentRepositoryContract } from "../interface/documentRepository.interface.js";

/**
 * register the sse event for a user of particular document and send an event on connect.
 */

export function eventRoutes(deps: {
  auth: AuthService;
  documents: DocumentRepositoryContract;
  hub: SseHub;
}): Router {
  const router = Router();

  router.use(requireAuth(deps.auth, { allowQueryToken: true }));

  router.get("/", async (req, res) => {
    const ownerId = userIdOf(res);

    const documentId =
      typeof req.query["documentId"] === "string"
        ? req.query["documentId"]
        : undefined;

    if (!documentId) throw new AppError(400, "Document Id is required.");

    const isValidUser = await deps.documents.findByIdForOwner(
      documentId,
      ownerId,
    );

    if (documentId && !isValidUser) {
      throw new AppError(404, "Document not found", "not_found");
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    // retry to connect after 3s.
    res.write("retry: 3000\n\n");

    await deps.hub.start();

    // Register first, then read the snapshot, so no event can fall into a gap.
    const remove = deps.hub.add({ ownerId, documentId, res });

    // close the connection when the browser shut off.
    req.on("close", remove);

    const doc = await deps.documents.findByIdForOwner(documentId, ownerId);

    if (doc) deps.hub.send(res, "snapshot", toDocumentDto(doc));
  });

  return router;
}
