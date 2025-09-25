"use client";
import { useEffect, useState } from "react";

const useMounted = () => {
  const [mounted, setMounted] = useState(false);

  // We received an error because in the server we have "vs-dark" as the theme, but in the client we the value the user have selected and we took from the local storage. Also for a split second, the server value was shown and then it changed to the client one. To remove this effect and also the error we created the mounted state and also the following useEffect to make the state true only after the component is mounted and before that we do not display this button. (same functionality for languages)
  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
};

export default useMounted;
