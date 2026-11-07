import { AppError } from "../utils/error.js";
import fs from "fs/promises";

export class FileService {
  private isDirExist = async (path: string): Promise<boolean> => {
    try {
      await fs.access(path);
      return true;
    } catch (error) {
      console.log("[dir not exists file exists]", error);
      return false;
    }
  };

  createDirectory = async (path: string) => {
    try {
      if (await this.isDirExist(path)) return;
      await fs.mkdir(path, { recursive: true });
      return true;
    } catch (error) {
      console.log("Failed to create directory");
      throw new AppError(500, "Failed to create directory.");
    }
  };

  removeFile = async (path: string) => {
    try {
      await fs.unlink(path);
      return true;
    } catch (error) {
      console.log("[file handling] Failed to remove file", error);
      throw new AppError(500, "[File Handling] failed to remove file");
    }
  };
}

export const fileService = new FileService();
