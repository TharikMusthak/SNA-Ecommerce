const Spinner = ({ className = "" }) => {

return(

<div
  role="status"
  aria-label="Loading"
  className={`h-8 w-8 animate-spin rounded-full border-4 border-green-700 border-t-transparent ${className}`}
/>

);

};

export default Spinner;
