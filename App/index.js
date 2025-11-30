// Index page: slow transition to form.html
(function () {
  const startBtn = document.getElementById('startBtn');
  const hero = document.querySelector('.hero');

  function slowNavigate(to) {
    // add animation classes to hero/page so movement is slow and dynamic
    document.documentElement.classList.add('page-leaving');
    hero.classList.add('leaving');

    // after transition, navigate
    setTimeout(() => {
      window.location.href = to;
    }, 900); // timing matches CSS transition timing (900ms)
  }

  startBtn?.addEventListener('click', function (e) {
    e.preventDefault();
    slowNavigate('form.html');
  });
})();
