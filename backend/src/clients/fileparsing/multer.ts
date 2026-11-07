import multer from "multer";
import path from "path";
import FileParsingInterafce from "../../interface/fileparsing.interface.js";
import { DocumentRouteDeps } from "../../routes/document.route.js";
import { fileService } from "../../services/fileHandling.js";
import { randomUUID } from "crypto";
import { AppError } from "../../utils/error.js";

class MulterService implements FileParsingInterafce {
  constructor(private readonly deps: DocumentRouteDeps) {}

  public singleFileParsing = async () => {
    const tmpDir = path.resolve(this.deps.config.UPLOAD_DIR as string, ".tmp");
    await fileService.createDirectory(tmpDir);

    const storage = this.fileDestinationDefination({
      destination: tmpDir,
    });

    const upload = this.fileValidation({ storage });
    return upload;
  };

  private fileDestinationDefination = ({
    destination,
  }: {
    destination: string;
  }) => {
    const storage = multer.diskStorage({
      destination: destination,
      filename: (req, file, cb) => {
        cb(null, randomUUID());
      },
    });

    return storage;
  };

  private fileValidation = ({ storage }: { storage: multer.StorageEngine }) => {
    const upload = multer({
      storage,

      limits: {
        fileSize: (this.deps.config.MAX_UPLOAD_MB as number) * 1024 * 1024,
        files: 1,
      },

      // Check extension/type
      fileFilter: (_req, file, cb) => {
        if (this.deps.parsers.supports(file.mimetype)) cb(null, true);
        else
          cb(
            new AppError(
              415,
              `Unsupported file type: ${file.mimetype}`,
              "unsupported_type",
            ),
          );
      },
    });

    return upload;
  };
}

export default MulterService;
