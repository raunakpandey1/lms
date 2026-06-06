/* eslint-disable react-refresh/only-export-components */
import {
  BlockquotePlugin,
  BoldPlugin,
  CodePlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  ItalicPlugin,
  UnderlinePlugin,
} from "@platejs/basic-nodes/react";

import {
  createPlatePlugin,
  ParagraphPlugin,
  PlateElement,
  PlateLeaf,
  type PlateElementProps,
  type PlateLeafProps,
} from "platejs/react";

function ParagraphElement(props: PlateElementProps) {
  return <PlateElement as="p" className="plate-paragraph" {...props} />;
}

function H1Element(props: PlateElementProps) {
  return <PlateElement as="h1" className="plate-heading h1" {...props} />;
}

function H2Element(props: PlateElementProps) {
  return <PlateElement as="h2" className="plate-heading h2" {...props} />;
}

function H3Element(props: PlateElementProps) {
  return <PlateElement as="h3" className="plate-heading h3" {...props} />;
}

function BlockquoteElement(props: PlateElementProps) {
  return <PlateElement as="blockquote" className="plate-blockquote" {...props} />;
}

function CodeLeaf(props: PlateLeafProps) {
  return <PlateLeaf as="code" className="plate-inline-code" {...props} />;
}

function CodeBlockElement(props: PlateElementProps) {
  return (
    <PlateElement as="pre" className="plate-code-block" {...props}>
      <code>{props.children}</code>
    </PlateElement>
  );
}

function LinkElement({
  children,
  element,
  ...props
}: PlateElementProps & {
  element: {
    url?: string;
  };
}) {
  const href = element.url || "#";

  return (
    <PlateElement element={element} {...props}>
      <a href={href} target="_blank" rel="noreferrer" className="plate-link">
        {children}
      </a>
    </PlateElement>
  );
}

function ImageElement({
  children,
  element,
  ...props
}: PlateElementProps & {
  element: {
    url?: string;
    alt?: string;
  };
}) {
  return (
    <PlateElement
      element={element}
      as="div"
      className="plate-image-node"
      {...props}
    >
      <div contentEditable={false}>
        {element.url ? (
          <img src={element.url} alt={element.alt || "Chapter image"} />
        ) : (
          <p className="muted">Image URL missing.</p>
        )}
      </div>

      {children}
    </PlateElement>
  );
}

export const LinkPlugin = createPlatePlugin({
  key: "link",
  node: {
    isElement: true,
    isInline: true,
    type: "link",
  },
}).withComponent(LinkElement);

export const ImagePlugin = createPlatePlugin({
  key: "image",
  node: {
    isElement: true,
    isVoid: true,
    type: "image",
  },
}).withComponent(ImageElement);

export const SimpleCodeBlockPlugin = createPlatePlugin({
  key: "code_block",
  node: {
    isElement: true,
    type: "code_block",
  },
}).withComponent(CodeBlockElement);

export const lmsPlatePlugins = [
  ParagraphPlugin.withComponent(ParagraphElement),
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  CodePlugin.withComponent(CodeLeaf),
  H1Plugin.withComponent(H1Element),
  H2Plugin.withComponent(H2Element),
  H3Plugin.withComponent(H3Element),
  BlockquotePlugin.withComponent(BlockquoteElement),
  SimpleCodeBlockPlugin,
  LinkPlugin,
  ImagePlugin,
];