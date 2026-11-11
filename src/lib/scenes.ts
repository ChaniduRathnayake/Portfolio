/**
 * The six scenes of the scroll, in order. Index = position on the camera
 * timeline: scene i occupies timeline values [i, i + 1).
 *
 * `label` names the 3D scene; `nav` is what visitors see in navigation.
 */
export const SCENES = [
  { id: "top", label: "The CRT room", nav: "Intro" },
  { id: "stack", label: "Into the code", nav: "About" },
  { id: "work", label: "The network", nav: "Work" },
  { id: "breach", label: "The breach", nav: "Security" },
  { id: "log", label: "The log", nav: "Experience" },
  { id: "contact", label: "Exit", nav: "Contact" },
] as const;

export const SCENE_COUNT = SCENES.length;
