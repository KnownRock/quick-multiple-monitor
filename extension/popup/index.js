!(function () {
  const widthSlider = document.getElementById('width')
  const heightSlider = document.getElementById('height')

  const widthLabel = document.getElementById('width-label')
  const heightLabel = document.getElementById('height-label')

  const saveBtn = document.getElementById('btn')
  const resetBtn = document.getElementById('reset')

  function onSliderValueChanged() {
    widthLabel.innerText = `${widthSlider.value}px`
    heightLabel.innerText = `${heightSlider.value}px`
  }

  chrome.storage.sync.get('size', (data) => {
    widthSlider.value = (data && data.size && data.size.width) || 320
    heightSlider.value = (data && data.size && data.size.height) || 180
    onSliderValueChanged()
  })

  widthSlider.addEventListener('input', () => {
    onSliderValueChanged()
  })

  heightSlider.addEventListener('input', () => {
    onSliderValueChanged()
  })

  resetBtn.addEventListener('click', () => {
    widthSlider.value = 320
    heightSlider.value = 180
    onSliderValueChanged()
  })

  saveBtn.addEventListener('click', () => {
    chrome.storage.sync.set({
      size: {
        width: widthSlider.value,
        height: heightSlider.value,
      },
    }, () => {
      // eslint-disable-next-line no-alert
      alert('saved')
    })
  })
}())
