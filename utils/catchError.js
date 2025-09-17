export async function catchError(res, status, errorMessage) {
  res
    .status(status || 500)
    .json({ message: errorMessage || "Something went wrong" });
}
