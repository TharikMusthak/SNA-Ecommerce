import clsx from "clsx";

const Button = ({
children,
variant="primary",
className,
...props
})=>{

const styles={

primary:"bg-green-700 hover:bg-green-800 text-white",

secondary:"bg-yellow-500 hover:bg-yellow-600 text-white",

outline:"border border-green-700 text-green-700 hover:bg-green-50",

danger:"bg-red-600 hover:bg-red-700 text-white"

};

return(

<button

className={clsx(

"px-5 py-3 rounded-xl font-medium transition",

styles[variant],

className

)}

{...props}

>

{children}

</button>

);

};

export default Button;