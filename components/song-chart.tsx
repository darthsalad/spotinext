import { SongFeatures } from '@/types/song-features'
import {
	Chart as ChartJS,
	RadialLinearScale,
	PointElement,
	LineElement,
	Filler,
	Tooltip,
	Legend,
} from "chart.js";
import { Radar } from 'react-chartjs-2'

interface ChartProps {
  features: SongFeatures
}

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const FeatureChart = (props: ChartProps) => {
  const { features } = props
  const normalizedFeatures = {
    Acousticness: features.acousticness * 100,
    Danceability: features.danceability * 100,
    Energy: features.energy * 100,
    Instrumentalness: features.instrumentalness * 100,
    Liveness: features.liveness * 100,
    Valence: features.valence * 100,
    Speechiness: features.speechiness * 100,
  }
  return (
		<div>
			<Radar
				className="w-[250px] h-[250px] sm:w-[300px] sm:h-[300px]"
				data={{
					labels: Object.keys(normalizedFeatures),
					datasets: [
						{
							label: "Song Features",
							data: Object.values(normalizedFeatures),
							backgroundColor: "rgba(22, 163, 74, 0.2)",
							borderColor: "rgb(22, 163, 74)",
							pointBackgroundColor: "rgb(22, 163, 74)",
							pointBorderColor: "#fff",
							pointHoverBackgroundColor: "#fff",
							pointHoverBorderColor: "rgb(22, 163, 74)",
						},
					],
				}}
				options={{
					responsive: true,
					plugins: {
						legend: {
              display: false
						},
						tooltip: {
							callbacks: {
								label: (context) => {
									return context.label + ": " + context.formattedValue + "%";
								},
              },
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              bodyFont: {
                size: 13
              },
              titleFont: {
                size: 15
              },
						},
					},
					scales: {
						r: {
							angleLines: {
								color: "rgba(22, 163, 74, 0.35)",
							},
							grid: {
								color: "rgba(22, 163, 74, 0.35)",
							},
							ticks: {
								color: "rgba(255, 255, 255, 0.5)",
								backdropColor: "rgba(22, 163, 74, 0)",
							},
							pointLabels: {
								color: "rgba(255, 255, 255, 0.5)",
              },
              
						},
					},
				}}
			/>
		</div>
	);
}

export default FeatureChart