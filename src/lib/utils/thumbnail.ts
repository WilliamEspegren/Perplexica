export const getSearchThumbnailSrc = (thumbnail: string) => {
  try {
    const url = new URL(thumbnail);
    const id = url.searchParams.get('id');

    if (id) {
      return `${url.origin}${url.pathname}?id=${id}`;
    }
  } catch {
    return thumbnail;
  }

  return thumbnail;
};
