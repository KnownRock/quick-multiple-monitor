// for chrome
// https://stackoverflow.com/questions/47831741/property-share-does-not-exist-on-type-navigator
interface Navigator extends Navigator{
  userAgentData: {
    platform: string,
  }
}

type Coord = {
  x: number,
  y: number,
}

type Size = {
  width: number,
  height: number,
}

type SimpleScreen = Coord & Size

type SimpleScreenCoord = Coord

type CreateScreenInfo = SimpleScreenCoord & { url: string }
