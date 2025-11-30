// Play Super Mario Bros. theme on page load, hide all content until song ends or user interacts
(function () {
  // Path to your audio file (must be present in App/ or update path)
  const AUDIO_PATH = "../Songs/SUPER MARIO BROS. - Main Theme By Koji Kondo  Nintendo.mp3";

  // Create audio element
  const audio = document.createElement('audio');
  audio.src = AUDIO_PATH;
  audio.autoplay = true;
  audio.preload = 'auto';
  audio.loop = false;
  audio.style.display = 'none';
  document.body.appendChild(audio);

  // Hide everything
  document.body.style.visibility = 'hidden';
  document.body.style.background = 'black';
  document.body.style.height = '100vh';
  document.body.style.margin = '0';

  // Show content after song ends or user interacts
  function showContent() {
    document.body.style.visibility = '';
    document.body.style.background = '';
    document.body.style.height = '';
    document.body.style.margin = '';
    audio.pause();
    audio.currentTime = 0;
    window.removeEventListener('keydown', showContent);
    window.removeEventListener('mousedown', showContent);
    audio.removeEventListener('ended', showContent);
  }

  // If autoplay is blocked, show content on user interaction
  audio.addEventListener('play', function () {
    // If it plays, keep hidden until end
    audio.addEventListener('ended', showContent);
  });
  audio.addEventListener('error', showContent);

  // Fallback: show on any user interaction
  window.addEventListener('keydown', showContent);
  window.addEventListener('mousedown', showContent);

  // If browser blocks autoplay, show after short delay
  setTimeout(() => {
    if (audio.paused) showContent();
  }, 8000);
})();
