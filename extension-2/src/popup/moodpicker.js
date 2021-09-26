const images = []
document.querySelectorAll('img').forEach(element => {
    images.push({id: element.id, element})
})
console.log(images)

chrome.storage.sync.get('moodId', (data) => {
  images.forEach(image => {
    if (image.id === data.moodId){
      image.element.style.borderColor = '#E49076';
    }
    image.element.onclick = (event) => {
      chrome.storage.sync.set({ moodId: image.id });

      images.forEach(image => {
        image.element.style = {}
      });

      image.element.style.borderColor = '#E49076';
    }
  });
});

document.querySelector('button').addEventListener('click', e => {
  chrome.storage.sync.get('link', data => navigator.clipboard.writeText(data.link));
});
