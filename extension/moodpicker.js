
const images = [
  { element: document.getElementById('happy'), mood: 'happy' },
  { element: document.getElementById('mad'), mood: 'mad' },
  { element: document.getElementById('default'), mood: 'default' }
]
chrome.storage.sync.get('mood', (data) => {
  images.forEach(image => {
    if (image.mood === data.mood)
      image.element.style.backgroundColor = 'coral';
    image.element.onclick = (event) => {
      chrome.storage.sync.set({ mood: image.mood });

      images.forEach(image => {
        image.element.style = {}
      });

      event.target.style.backgroundColor = 'coral';
    }
  });
})

