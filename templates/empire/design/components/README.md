# Design Components

Reusable component definitions for OpenDesign. Each JSON file declares a
component type, its name, and its default props:

```json
{
  "id": "button",
  "type": "button",
  "name": "Button",
  "description": "Primary action button",
  "defaultProps": { "text": "Click me", "variant": "primary" }
}
```

Component types understood by the canvas and the code generator:
`box, text, heading, button, input, card, navbar, image, form, list`.
