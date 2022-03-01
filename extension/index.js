!(function(){
  const textarea = document.getElementById("textarea");
  const btn = document.getElementById("btn");
  const resetButton = document.getElementById("reset")

  const allScreens = chrome.storage.sync.get("allScreensJson", function(data){
    textarea.value = data.allScreensJson
  })

  resetButton.addEventListener("click", function(){
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
      alert('success');
    });


    



  });
})()

