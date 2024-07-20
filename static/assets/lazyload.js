   // lazyload.js
   document.addEventListener('DOMContentLoaded', () => {
     const images = document.querySelectorAll('img[data-src]');

     const lazyLoad = target => {
       const io = new IntersectionObserver((entries, observer) => {
         entries.forEach(entry => {
           if (entry.isIntersecting) {
             const img = entry.target;
             img.src = img.dataset.src;
             img.onload = () => {
               img.classList.add('loaded');
             };
             observer.disconnect();
           }
         });
       });

       io.observe(target);
     };

     images.forEach(img => {
       lazyLoad(img);
     });
   });
