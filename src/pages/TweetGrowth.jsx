import { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

function TweetGrowth() {
  const [loading, setLoading] = useState(true);
  const [tweetData, setTweetData] = useState([]);
  const [uploadDate, setUploadDate] = useState(null);
  const [showCumulative, setShowCumulative] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/tweet_results.json").then((res) => res.json()),
      fetch("/upload.json").then((res) => res.json()),
      fetch("/selfQuotedTweets.json").then((res) => res.json()),
    ])
      .then(([tweets, uploadData, quotesData]) => {
        const uploadDate = new Date(uploadData[0].endDate);
        setUploadDate(uploadDate);

        // Process regular tweets
        const sortedTweets = tweets
          .filter((tweet) => tweet.tweet_text !== "Tweet not found")
          .map((tweet) => new Date(tweet.created_at))
          .sort((a, b) => a - b);

        // Process quoted tweets
        const sortedQuotes = quotesData
          .map((quote) => new Date(quote.created_at))
          .sort((a, b) => a - b);

        // Create a map of all months between first tweet and upload date
        const monthlyData = {};
        const startDate = new Date(sortedTweets[0]);
        const currentDate = new Date(startDate);

        while (currentDate <= uploadDate) {
          const key = currentDate.toISOString().slice(0, 7);
          monthlyData[key] = { tweets: 0, quotes: 0 };
          currentDate.setMonth(currentDate.getMonth() + 1);
        }

        // Count tweets per month
        sortedTweets.forEach((date) => {
          const key = date.toISOString().slice(0, 7);
          monthlyData[key].tweets += 1;
        });

        // Count quotes per month
        sortedQuotes.forEach((date) => {
          const key = date.toISOString().slice(0, 7);
          if (monthlyData[key]) {
            // Only count if within our date range
            monthlyData[key].quotes += 1;
          }
        });

        // Calculate cumulative totals
        let tweetSum = 0;
        let quoteSum = 0;
        const processedData = Object.entries(monthlyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, counts]) => {
            tweetSum += counts.tweets;
            quoteSum += counts.quotes;
            return {
              date: new Date(date),
              monthly: {
                tweets: counts.tweets,
                quotes: counts.quotes,
              },
              cumulative: {
                tweets: tweetSum,
                quotes: quoteSum,
              },
            };
          });

        setTweetData(processedData);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading data:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center h-screen px-4">
        <div className="w-full max-w-md">
          <div className="mb-4 text-center">
            <h2 className="text-xl font-semibold mb-2">
              Loading Visa&apos;s Tweets - there&apos;s a lot of them!
            </h2>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: tweetData.map((item) => item.date),
    datasets: [
      {
        label: showCumulative ? "Total Tweets" : "Tweets per Month",
        data: tweetData.map((item) =>
          showCumulative ? item.cumulative.tweets : item.monthly.tweets
        ),
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.5)",
        fill: true,
        yAxisID: "y",
      },
      {
        label: showCumulative ? "Total Quote Tweets" : "Quote Tweets per Month",
        data: tweetData.map((item) =>
          showCumulative ? item.cumulative.quotes : item.monthly.quotes
        ),
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        borderDash: [5, 5],
        fill: true,
        yAxisID: "y",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: showCumulative
          ? "Cumulative Tweet Count Over Time"
          : "Monthly Tweet Count",
      },
      tooltip: {
        callbacks: {
          title: (context) => {
            // Format the date as "MMM DD, YYYY"
            return new Date(context[0].parsed.x).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
          },
          label: (context) => {
            const value = context.raw.toLocaleString();
            return `${context.dataset.label}: ${value}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "time",
        time: {
          unit: "month",
          displayFormats: {
            month: "MMM yyyy",
          },
        },
        title: {
          display: true,
          text: "Date",
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: showCumulative ? "Total Tweets" : "Tweets per Month",
        },
        ticks: {
          callback: (value) => value.toLocaleString(),
        },
      },
    },
  };

  const getMostActiveMonth = () => {
    const monthData = tweetData.map((item) => ({
      date: item.date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      }),
      count: item.monthly.tweets,
    }));

    return monthData.reduce(
      (max, curr) => (curr.count > max.count ? curr : max),
      { count: 0 }
    ).date;
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Tweet Growth Over Time</h1>
          <p className="text-gray-600">
            Total Tweets:{" "}
            {tweetData[
              tweetData.length - 1
            ]?.cumulative.tweets.toLocaleString()}
          </p>
          {uploadDate && (
            <p className="text-gray-600">
              Data up to:{" "}
              {uploadDate.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowCumulative(!showCumulative)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Show {showCumulative ? "Monthly" : "Cumulative"} View
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Key Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded">
            <h3 className="text-lg font-medium mb-2">
              Average Tweets per Month
            </h3>
            <p className="text-2xl font-bold">
              {Math.round(
                tweetData[tweetData.length - 1]?.cumulative.tweets /
                  tweetData.length
              ).toLocaleString()}
            </p>
          </div>
          <div className="p-4 border rounded">
            <h3 className="text-lg font-medium mb-2">Most Active Month</h3>
            <p className="text-2xl font-bold">{getMostActiveMonth()}</p>
          </div>
          <div className="p-4 border rounded">
            <h3 className="text-lg font-medium mb-2">Years Active</h3>
            <p className="text-2xl font-bold">
              {new Date(uploadDate - tweetData[0].date).getFullYear() - 1970}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TweetGrowth;
