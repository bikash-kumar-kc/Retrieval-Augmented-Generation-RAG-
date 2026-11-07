import { Router } from "express";
import { requireAuth, userIdOf } from "../middleware/auth.js";
import { AuthService } from "../services/AuthService.js";
import { DocumentService } from "../services/documentService.js";
import { ParserRegistry } from "../services/parse/parseService.js";
import { UploadService } from "../services/uploadService.js";
import { Config } from "../config.js";
import { AppError } from "../utils/error.js";
import { toDocumentDto } from "../dto.js";
import { DocumentRepositoryContract } from "../interface/documentRepository.interface.js";
import MulterService from "../clients/fileparsing/multer.js";
import { fileService } from "../services/fileHandling.js";

export interface DocumentRouteDeps {
  config: Pick<Config, "UPLOAD_DIR" | "MAX_UPLOAD_MB">;
  auth: AuthService;
  documents: DocumentRepositoryContract;
  parsers: ParserRegistry;
  uploads: UploadService;
  documentService: DocumentService;
}

export async function documentRoutes(deps: DocumentRouteDeps): Promise<Router> {
  const router = Router();

  router.use(requireAuth(deps.auth));

  const upload = await new MulterService(deps).singleFileParsing();

  // accepts file and store
  router.post("/", upload.single("file"), async (req, res) => {
    if (!req.file)
      throw new AppError(
        400,
        'Expected a multipart field named "file"',
        "no_file",
      );

    const result = await deps.uploads.ingest({
      ownerId: userIdOf(res),
      tmpPath: req.file.path,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      agentPrompt:req.body.agentPrompt
    });

    return res.status(result.duplicate ? 200 : 202).json({
      document: toDocumentDto(result.document),
      duplicate: result.duplicate,
    });
  });

  // returns all document of user.
  router.get("/", async (req, res) => {
    const docs = await deps.documents.listByOwner(userIdOf(res));
    res.json({ documents: docs.map(toDocumentDto) });
  });

  // to get particular document.
  router.get("/:id", async (req, res) => {
    const doc = await deps.documents.findByIdForOwner(
      req.params["id"] as string,
      userIdOf(res),
    );
    if (!doc) throw new AppError(404, "Document not found", "not_found");
    res.json({ document: toDocumentDto(doc) });
  });

  

  // Resume a failed document from its last completed stage
  router.post("/:id/retry", async (req, res) => {
    const doc = await deps.documents.findByIdForOwner(
      req.params["id"] as string,
      userIdOf(res),
    );

    if (!doc) throw new AppError(404, "Document not found", "not_found");

    const response = await deps.uploads.retry(doc);

    res.status(202).json({ document: toDocumentDto(response) });
  });

  // to delete a document.
  router.delete("/:id", async (req, res) => {
    const doc = await deps.documents.findByIdForOwner(
      req.params["id"] as string,
      userIdOf(res),
    );

    if (!doc) throw new AppError(404, "Document not found", "not_found");

    await deps.documentService.remove(doc, fileService);

    res.status(204).end();
  });

  return router;
}
