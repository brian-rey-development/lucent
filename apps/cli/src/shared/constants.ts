export const EXIT_CODES = {
  ok: 0,
  failed: 1,
  usage: 2,
  input: 3,
  internal: 70,
} as const;

export const PROGRAM = "lucent";

export const MAX_FILE_BYTES = 1024 * 1024;

export const NUL = 0;

export const OUTSIDE_ROOT = "is outside the video folder";

export const ERRNO_REASONS: Readonly<Record<string, string>> = {
  ENOENT: "no such file",
  ENOTDIR: "no such file",
  EACCES: "permission denied",
  EPERM: "permission denied",
  EISDIR: "is a directory",
  ELOOP: "too many symbolic links",
  ENAMETOOLONG: "path too long",
};
