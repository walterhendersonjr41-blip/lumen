/* Built-in scenes: photos plus written descriptions the free AI uses as facts (and as an offline fallback). */
window.LUMEN_SCENES = {
  station: {
    title: "Night pump", place: "Fuel island", src: "scenes/station.jpg",
    greeting: "I'm beside the car. The pump is holstered and the store is lit. Tell me what to change, or ask what I can't quite see.",
    chips: ["Open the driver door", "Pump the gas", "Pop the hood", "What's inside the store?", "What do you see looking my way?", "What's down the street?"],
    answers: {
      see: "A green sedan at the pump on wet pavement, the nozzle holstered, and a lit convenience store behind it under a dusky blue sky.",
      store: "Through the glass it's a lit counter, snack shelves, and a cooler of bottled drinks along the back wall. Coffee sits by the register, and a stock door is at the end of the aisle.",
      street: "Down the road to the left it's a dark shoulder, trees, and the next pool of streetlight a block or so on. No sign I can read, just the wet lane leaving the station.",
      toward: "Looking your way, the pavement between us is wet and empty, with the dusk sky behind you. The lot opens out and the road slips off the left edge of the frame.",
      behind: "Behind the store I'd expect a dumpster pad, the air pump, and a strip of trees before the next lot. The light falls off fast back there."
    },
    edits: {
      "open the driver door": "I'll open the driver door. It swings out over the wet concrete and the dome light comes on inside.",
      "pump the gas": "I'll pump the gas. Nozzle out of the holster, into the filler, and the numbers start rolling on the screen.",
      "pop the hood": "I'll pop the hood. It lifts on its strut and the engine bay catches the canopy light."
    }
  },
  street: {
    title: "Corner grocery", place: "Main street", src: "scenes/street.jpg",
    greeting: "I'm on the sidewalk. The door is open and the street runs off to the right. Ask me, or change the picture.",
    chips: ["What's inside the store?", "What's down the street?", "What's behind the store?", "Close the door", "What do you see looking my way?", "Move the bicycle"],
    answers: {
      see: "A brick corner grocery with crates of produce out front, a bicycle leaning on the wall, and a tree-lined street running off in late gold light.",
      store: "The door is open on a small grocery: produce crates up front, then dry-goods shelves and a counter just inside. A cooler and a stock-room door sit at the back.",
      street: "Down the street the brick buildings keep going, with trees and long shadows and a quieter block past the corner. That's where the road bends out of sight.",
      behind: "Behind the grocery is a narrow back lot, a dumpster, and the alley between the brick walls. The street noise stays on this side.",
      toward: "Looking your way I see the sidewalk under you and the street pulling off behind your shoulder. Late light, long shadows, and the next row of buildings past you."
    },
    edits: {
      "close the door": "I'll close the door. The glass panes catch the street and the shop goes quiet behind them.",
      "move the bicycle": "I'll move the bicycle. I roll it a few steps down the sidewalk and lean it against the tree."
    }
  },
  driveway: {
    title: "Flat tire", place: "Driveway", src: "scenes/driveway.jpg",
    greeting: "The front tire is down. I can change it, open the garage, or tell you what I think is inside.",
    chips: ["Change the tire", "Open the garage", "Pop the hood", "What's in the garage?", "What's behind the house?", "What do you see looking my way?"],
    answers: {
      see: "A silver hatchback in the driveway with its front tire low, a closed garage door, a hose coiled on the wall, and a big maple overhead.",
      garage: "The garage door is down. On the other side I'd put a mower, a couple of bins, and tools along the back wall, with the hose hook just inside.",
      store: "The garage door is down. On the other side I'd put a mower, a couple of bins, and tools along the back wall, with the hose hook just inside.",
      behind: "Behind the house is a fenced yard, the maple's shade, and the back of the garage. Nothing tall enough to see over the roof from here.",
      toward: "Looking your way it's the concrete drive running toward the street, maple shade, and the gray sky behind you. Nobody else is in the driveway.",
      street: "Past the end of the drive it's a quiet residential street, more maples, and the neighbor's lawn. No traffic right now."
    },
    edits: {
      "change the tire": "I'll change the tire. Jack under the frame, lug nuts off, spare on, and the car settles level again.",
      "open the garage": "I'll open the garage. The door rolls up and the shadowed bay behind it comes into view.",
      "pop the hood": "I'll pop the hood. It lifts and the engine sits there under the gray daylight."
    }
  },
  upload: {
    title: "Your photo", place: "Your frame", src: "",
    greeting: "I'm in. Ask what I see — looking your way counts — or tell me what to change.",
    chips: ["What do you see?", "What's just out of frame?", "What do you see looking my way?", "Open the nearest door."],
    answers: {}, edits: {}
  }
};
