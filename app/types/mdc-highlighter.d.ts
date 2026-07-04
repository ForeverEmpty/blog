declare module '#mdc-highlighter' {
  type HighlightResult = {
    tree: unknown[]
    className?: string
    style?: string
    inlineStyle?: string
  }

  const highlighter: (
    code: string,
    language?: string,
    theme?: unknown,
    options?: Record<string, unknown>,
  ) => Promise<HighlightResult>

  export default highlighter
}
