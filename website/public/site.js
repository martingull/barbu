const poster = document.querySelector('.video-poster');

// Keep YouTube requests behind an explicit play action; the link works without JS.
if (poster) {
  poster.hidden = false;
  poster.addEventListener('click', () => {
    const player = document.createElement('iframe');
    player.src = 'https://www.youtube-nocookie.com/embed/FeuhyBNAAv0?autoplay=1&playsinline=1';
    player.title = 'Barbu preview: Learn here. Play together.';
    player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    player.allowFullscreen = true;
    player.referrerPolicy = 'strict-origin-when-cross-origin';
    poster.replaceWith(player);
    player.focus();
  }, { once: true });
}
