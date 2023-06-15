"use client";
export default function Home() {
	const cleanupFunc = () => {
		fetch("http://localhost:5000/cleanup")
			.then((response) => response.json())
			.then((data) => {
				console.log(data);
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	};

	const handleClick = async () => {
		fetch("http://localhost:5000/song/123", {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		})
			.then((response) => response.blob())
			.then((blob) => {
				const url = window.URL.createObjectURL(new Blob([blob]));
				const link = document.createElement("a");
				link.href = url;
				link.setAttribute("download", "song.mp3");
				document.body.appendChild(link);
				link.click();
        link.parentNode!.removeChild(link);
      })
      .then(() => {
        cleanupFunc();
      })
			.catch((error) => {
				console.error("Error:", error);
			});
	};

	return (
		<main>
			<div className="flex justify-center items-center min-h-screen">
        <button
          className="bg-violet-500 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-md"
          onClick={handleClick}
        >
          Download song
        </button>
			</div>
		</main>
	);
}
