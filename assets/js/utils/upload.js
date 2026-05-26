import apiClient from "../api/client.js";
import { resolveStorageUrl } from "./media.js";

export async function uploadImage(file, type = "product") {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("type", type);
  const res = await apiClient.upload("/media/upload", fd);
  if (!res.success) {
    return { success: false, error: res.error || "Upload failed" };
  }
  const raw = res.data?.url || res.data?.path || "";
  return { success: true, url: resolveStorageUrl(raw) };
}

export default uploadImage;
