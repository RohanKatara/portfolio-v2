export function initWebsiteMedia() {
  const dialog = document.querySelector<HTMLDialogElement>('#media-dialog');
  const video = document.querySelector<HTMLVideoElement>('#showcase-video');
  const image = document.querySelector<HTMLImageElement>('#showcase-image');
  const title = document.querySelector<HTMLElement>('#media-title');
  const description = document.querySelector<HTMLElement>('#media-description');
  const original = document.querySelector<HTMLAnchorElement>('#media-original');
  if (!dialog || !video || !image || !title || !description || !dialog.showModal) return;

  let trigger: HTMLAnchorElement | null = null;
  let previousOverflow = '';
  const close = () => dialog.close();
  document.querySelectorAll<HTMLAnchorElement>('[data-image-open], [data-video-open]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      trigger = link;
      title.textContent = link.dataset.title || 'Website preview';
      description.textContent = link.dataset.description || 'A closer look at the website design. Close to continue exploring the projects.';
      const isVideo = link.hasAttribute('data-video-open');
      video.hidden = !isVideo;
      image.hidden = isVideo;
      if (original) {
        original.hidden = isVideo;
        original.href = link.href;
      }
      if (isVideo) {
        video.poster = link.dataset.poster || '';
        video.src = link.dataset.video || link.href;
        video.load();
      } else {
        image.src = link.href;
        image.alt = link.querySelector('img')?.alt || link.dataset.title || 'Website screenshot';
      }
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      dialog.showModal();
    });
  });
  dialog.querySelector('[data-media-close]')?.addEventListener('click', close);
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
  });
  dialog.addEventListener('close', () => {
    video.pause();
    // Release the media request and decoder when the viewer is no longer open.
    video.removeAttribute('src');
    video.load();
    document.body.style.overflow = previousOverflow;
    trigger?.focus({ preventScroll: true });
  });
  video.addEventListener('error', () => {
    description.textContent = 'The recording could not load. Close this preview and use View website preview to explore the site.';
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause();
  });
}
