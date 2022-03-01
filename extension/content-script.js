!(async () => {
  // https://developer.chrome.com/docs/extensions/mv3/content_scripts/
  const exampleScreens = [
    { x: 0, y: -1080, width: 1920, height: 1080 },
    { x: 0, y: 0, width: 1920, height: 1080 },
    { x: 0, y: 1080, width: 1920, height: 1080 },
    { x: -1920, y: 0, width: 1920, height: 1080 },
    { x: +1920, y: 0, width: 1920, height: 1080 },
  ]

  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.top = '0px';
  div.style.left = '0px';
  div.style.display = 'none'
  div.style.pointerEvents = 'none';

  div.style.zIndex = '99999999';

  async function freshScreenDivs(div, {pageX,pageY}) {
    div.innerHTML = '';


    const {width,height} = await new Promise((resolve, reject) => {
      chrome.storage.sync.get('size', function(data) {
        if(!data || !data.size){
          resolve({
            width:320,
            height:180
          });
        }
        resolve((data.size));
      })
    })

    

    div.style.width = `${width}px`;
    div.style.height = `${height}px`;

    const allScreens = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ func: 'get-all-screens', }, function (response) {
        resolve(response.screens);
      });
    })
    
    const openerScreenIndex = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ func: 'get-screen-index'}, function(response){
        resolve(response.screenIndex)
      })
    })

    const { minX, maxX, minY, maxY } = allScreens.reduce((acc, screen) => {
      acc.minX = Math.min(acc.minX, screen.x);
      acc.maxX = Math.max(acc.maxX, screen.x + screen.width);
      acc.minY = Math.min(acc.minY, screen.y);
      acc.maxY = Math.max(acc.maxY, screen.y + screen.height);
      return acc;
    }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });


    const scaleX = width / (maxX - minX);
    const scaleY = height / (maxY - minY);

    const openerScreen = [allScreens[0],allScreens[openerScreenIndex]].reduce((acc, screen) => {
      if (screen) {
        acc = {...screen};
      }
      return acc;
    }, null);

    if(!openerScreen){
      console.log('no opener screen');
      return;
    }

    div.style.display = 'block';
    div.style.left = pageX - (openerScreen.x + openerScreen.width / 2 - minX) * scaleX + 'px';
    div.style.top = pageY - (openerScreen.y + openerScreen.height / 2 - minY) * scaleY + 'px';
    // debugger


    allScreens.forEach((screen, index) => {
      const sDiv = document.createElement('div');
      sDiv.style.position = 'absolute';
      sDiv.style.top = `${(screen.y - minY) * scaleY}px`;
      sDiv.style.left = `${(screen.x - minX) * scaleX}px`;
      sDiv.style.width = `${screen.width * scaleX}px`;
      sDiv.style.height = `${screen.height * scaleY}px`;
      // by github copilot
      sDiv.style.backgroundColor = `hsl(${index * 360 / allScreens.length}, 100%, 50%)`;
      // sDiv.style.border = '1px solid #000';
      sDiv.style.zIndex = '1';
      sDiv.style.pointerEvents = 'auto';
      sDiv.style.display = 'flex';
      sDiv.style.alignItems = 'center';
      sDiv.style.justifyContent = 'center';
      sDiv.innerHTML = `
        <div><h1 style="margin:0">${index}</h1></div>
      `



      sDiv.addEventListener('dragover', (e) => {
        if(e.dataTransfer.types.includes('text/html')) {
          e.preventDefault();
          e.stopPropagation();
        }
      });

      sDiv.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log(e);

        div.style.display = 'none';
        
        const url = e.dataTransfer.getData('text/uri-list')

        chrome.runtime.sendMessage({ func: 'open-new-tab', screenIndex: index, url });

        // alert(index)
      });

      const closeDiv = document.createElement('div');
      closeDiv.style.position = 'absolute';
      closeDiv.style.top = '0px';
      closeDiv.style.right = '0px';
      closeDiv.style.width = '20px';
      closeDiv.style.height = '20px';
      closeDiv.style.zIndex = '2';
      closeDiv.style.backgroundColor = 'lightgray';
      closeDiv.style.borderRadius = '50%';

      closeDiv.style.display = 'flex';
      closeDiv.style.alignItems = 'center';
      closeDiv.style.justifyContent = 'center';
      closeDiv.style.pointerEvents = 'auto';
      closeDiv.innerHTML = '<div>X</div>';

      closeDiv.addEventListener('click', () => {
        div.style.display = 'none';
      });

      closeDiv.addEventListener('dragover', (e) => {
        div.style.display = 'none';
        e.preventDefault();
        e.stopPropagation();
      });

      div.appendChild(closeDiv);

      div.appendChild(sDiv);


    });



  }


  document.body.appendChild(div);

  // on drag
  document.addEventListener('dragstart', async (e) => {
    if(e.dataTransfer.types.includes('text/html')) {
      setTimeout(async () => {
        await freshScreenDivs(div,e);
      }, 10);
    }
  })

  document.addEventListener('dragend', (e) => {
    div.style.display = 'none';
  })
})()