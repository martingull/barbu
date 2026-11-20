const poster = document.querySelector('.video-poster');

// Keep YouTube requests behind an explicit play action; the link works without JS.
if (poster) {
  poster.hidden = false;
  poster.addEventListener('click', () => {
    const videoId = poster.dataset.videoId;
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId ?? '')) return;
    const player = document.createElement('iframe');
    player.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1`;
    player.title = poster.dataset.videoTitle;
    player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    player.allowFullscreen = true;
    player.referrerPolicy = 'strict-origin-when-cross-origin';
    poster.replaceWith(player);
    player.focus();
  }, { once: true });
}
