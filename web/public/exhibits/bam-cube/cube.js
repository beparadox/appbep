// The original cube controller (view.js, c. 2016), minus jQuery.
(function () {
  var xAngle = 0,
    yAngle = 0,
    cube = document.getElementById('cube'),
    videoSide = document.getElementById('cube_video'),
    videoLoaded = false;

  // The video only loads after the first click, same as the original.
  function loadCubeVideo() {
    var iframe = document.createElement('iframe');
    iframe.width = 280;
    iframe.height = 210;
    iframe.src = 'https://www.youtube-nocookie.com/embed/dIOTV_ZtIwg';
    iframe.title = 'The good stuff';
    iframe.setAttribute('frameborder', '0');
    iframe.allowFullscreen = true;
    videoSide.appendChild(iframe);
  }

  function transformCube() {
    switch (this.id) {
      case 'bam_cube_up':
        xAngle += 90;
        break;
      case 'bam_cube_down':
        xAngle -= 90;
        break;
      case 'bam_cube_right':
        yAngle += 90;
        break;
      case 'bam_cube_left':
        yAngle -= 90;
        break;
      default:
        throw TypeError('Unknown id for bam_cube');
    }
    cube.style.transform = 'rotateX(' + xAngle + 'deg) rotateY(' + yAngle + 'deg)';
    if (!videoLoaded) {
      loadCubeVideo();
      videoLoaded = true;
    }
  }

  var buttons = document.querySelectorAll('.cube_buttons');
  for (var i = 0; i < buttons.length; i++) buttons[i].addEventListener('click', transformCube);
})();
