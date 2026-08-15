const ProductDescription = ({ description }) => {
  const text =
    description ||
    "Traditionally prepared with carefully selected ingredients.";

  const renderBoldText = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);

    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold text-gray-900">
            {part.slice(2, -2)}
          </strong>
        );
      }

      return part;
    });
  };

  return (
    <div className="mt-6 leading-7 text-gray-600">
      {text.split("\n").map((line, index) => {
        const trimmedLine = line.trim();

        const isHeading = [
          "Key Highlights:",
          "Key Benefits:",
          "Nutritional Benefits:",
          "Ingredients:",
        ].includes(trimmedLine);

        if (isHeading) {
          return (
            <strong
              key={index}
              className="block mt-4 mb-1 text-gray-900 font-semibold"
            >
              {trimmedLine}
            </strong>
          );
        }

        if (!trimmedLine) {
          return <div key={index} className="h-2" />;
        }

        return (
          <span key={index} className="block">
            {renderBoldText(trimmedLine)}
          </span>
        );
      })}
    </div>
  );
};

export default ProductDescription;