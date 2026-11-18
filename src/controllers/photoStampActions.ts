import { deleteLocalFiles } from '@/services/localMediaService';
import { setLocalPhotoMedia } from '@/services/photoQueueStorage';
import { renderPhotoStamp } from '@/services/photoStampService';
import { usePhotoStore } from '@/store/usePhotoStore';
import { Photo } from '@/types/domain';
import { needsPhotoStamp } from '@/utils/photoStamp';

/** Serialize each capture's renders, including capture, note saves and upload retries. */
const jobs = new Map<string, Promise<Photo>>();

export function refreshPhotoStamp(capture: Photo): Promise<Photo> {
  const previous = jobs.get(capture.id) ?? Promise.resolve(capture);
  const next = previous
    .catch(() => capture)
    .then(async () => {
      const photo = usePhotoStore.getState().photos.find(p => p.id === capture.id) ?? capture;
      if (photo.synced || !needsPhotoStamp(photo)) return photo;
      const rendered = await renderPhotoStamp(photo);
      try {
        // A strict write: never discard the currently referenced file if SQLite fails.
        await setLocalPhotoMedia(photo.personId, photo.id, rendered);
      } catch (error) {
        deleteLocalFiles([rendered.uri, rendered.localThumbUri]);
        throw error;
      }
      usePhotoStore.getState().setPhotoMedia(photo.id, rendered);
      deleteLocalFiles([photo.uri, photo.localThumbUri].filter(uri => uri !== photo.localStamp?.sourceUri));
      return rendered;
    });
  jobs.set(capture.id, next);
  const clear = () => {
    if (jobs.get(capture.id) === next) jobs.delete(capture.id);
  };
  next.then(clear, clear);
  return next;
}
