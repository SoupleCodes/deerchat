export function emojiPicker() {
  const emojiElement = document.getElementById('emojicomponent');
  if (emojiElement) {
    console.log("Element found!");
    return emojiElement;
  }

  const container = document.createElement('div');
  container.id = "emoji-table";
  container.innerHTML = `
<nav style="background-color: rgb(178, 203, 224); text-align: center; display: flex; justify-content: center;">
  <a href="#" id="special-nav" style="flex-grow:1; text-decoration: none;">
    special
  </a>
  <a href="#" id="emojis-nav" style="flex-grow:1; text-decoration: none;">
    emojis
  </a>
</nav>
<div id="emojis"></div>
  `;
  document.body.appendChild(container);
  return null;
}