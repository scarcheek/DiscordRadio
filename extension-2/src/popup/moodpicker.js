let currImage = null;

browser.storage.sync.get('moodId').then((data) => {
  document.querySelectorAll('img').forEach(image => {
    if (image.id === data.moodId) {
      currImage = image;
      currImage.style.borderColor = '#E49076';
    }
    
    image.addEventListener('click', e => {
      currImage.style = {};
      currImage = image;
      currImage.style.borderColor = '#E49076';
      browser.storage.sync.set({ moodId: currImage.id });
    });
  });
});

document.querySelector('#link-button').addEventListener('click', e => {
  browser.storage.sync.get('link').then(data => navigator.clipboard.writeText(data.link));
});
