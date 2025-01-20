import dynamic from "next/dynamic";

const CatchmentMap = dynamic(() => import("./map"), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default CatchmentMap;
