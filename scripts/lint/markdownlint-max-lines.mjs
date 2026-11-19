export default {
  names: ["max-lines", "CUSTOM001"],
  description: "File must not exceed a maximum number of lines",
  tags: ["line_length"],
  parser: "none",
  function: (params, onError) => {
    const maximum = params.config.maximum ?? 300;
    const total = params.lines.length;
    if (total > maximum) {
      onError({
        lineNumber: maximum + 1,
        detail: `File has ${total} lines, maximum is ${maximum}`,
      });
    }
  },
};
