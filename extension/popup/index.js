!(function () {
  const textarea = document.getElementById("textarea");
  const btn = document.getElementById("btn");
  const resetButton = document.getElementById("reset")

  const widthSlider = document.getElementById("width");
  const heightSlider = document.getElementById("height");

  const widthLabel = document.getElementById("width-label");
  const heightLabel = document.getElementById("height-label");

  chrome.storage.sync.get("allScreensJson", function (data) {
    textarea.value = data && data.allScreensJson || '[\n  { "x": 0, "y": 0, "width": 1920, "height": 1080 }\n]';
  })

  chrome.storage.sync.get("size", function (data) {
    widthSlider.value = data && data.size && data.size.width || 320
    heightSlider.value = data && data.size && data.size.height || 180

    widthLabel.innerText = widthSlider.value + 'px'
    heightLabel.innerText = heightSlider.value + 'px'
  })

  widthSlider.addEventListener("input", function () {
    widthLabel.innerText = widthSlider.value + "px"
  })

  heightSlider.addEventListener("input", function () {
    heightLabel.innerText = heightSlider.value + "px"
  })



  resetButton.addEventListener("click", function () {
    textarea.value = '[\n  { "x": 0, "y": 0, "width": 1920, "height": 1080 }\n]';
  })


  btn.addEventListener("click", () => {
    const data = textarea.value;
    console.log(data);
    // alert(data)
    let objs = [];
    try {
      objs = JSON.parse(data);
    } catch (e) {
      alert('invalid json');
    }

    const allScreens = objs
    const isValid = allScreens.every(screen => {
      if (screen.x === null || screen.x === undefined &&
        screen.y === null || screen.y === undefined &&
        screen.width === null || screen.width === undefined &&
        screen.height === null || screen.height === undefined) {
        alert('need x, y, width, height in each screen');
        return false;
      }
      return true;
    });

    if (!isValid) {
      return;
    }


    chrome.storage.sync.set({
      allScreensJson: data
    }, function () {

      chrome.storage.sync.set({
        size: {
          width: widthSlider.value,
          height: heightSlider.value
        }
      }, function () {
        alert('saved');
      })
    });


  });
})()

