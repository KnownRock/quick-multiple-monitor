!(function () {
  const widthSlider = document.getElementById("width");
  const heightSlider = document.getElementById("height");

  const widthLabel = document.getElementById("width-label");
  const heightLabel = document.getElementById("height-label");

  const saveBtn = document.getElementById("btn");
  const resetBtn = document.getElementById("reset")

  function onSliderValueChanged(){
    widthLabel.innerText = widthSlider.value + 'px'
    heightLabel.innerText = heightSlider.value + 'px'
  }

  chrome.storage.sync.get("size", function (data) {
    widthSlider.value = data && data.size && data.size.width || 320
    heightSlider.value = data && data.size && data.size.height || 180
    onSliderValueChanged()
  })

  widthSlider.addEventListener("input", function () {
    onSliderValueChanged()
  })

  heightSlider.addEventListener("input", function () {
    onSliderValueChanged()
  })

  resetBtn.addEventListener("click", function () {
    widthSlider.value = 320
    heightSlider.value = 180
    onSliderValueChanged()
  })


  saveBtn.addEventListener("click", () => {
    chrome.storage.sync.set({
      size: {
        width: widthSlider.value,
        height: heightSlider.value
      }
    }, function () {
      alert('saved');
    })
  });
})()

