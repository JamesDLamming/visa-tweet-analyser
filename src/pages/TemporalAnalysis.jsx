import { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import Papa from "papaparse";
import "chartjs-adapter-date-fns";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

function TemporalAnalysis() {
  const [tweets, setTweets] = useState([]);
  const [timeData, setTimeData] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("year");
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [filteredTweets, setFilteredTweets] = useState([]);
  const [showNormalized, setShowNormalized] = useState(false);
  const [uploadDate, setUploadDate] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [tweetSortBy, setTweetSortBy] = useState("date");
  const [tweetSortDirection, setTweetSortDirection] = useState("asc");

  useEffect(() => {
    Promise.all([
      fetch("/public/tweet_results.json").then((res) => res.json()),
      fetch("/public/upload.json").then((res) => res.json()),
    ])
      .then(([data, uploadData]) => {
        const uploadDate = new Date(uploadData[0].endDate);
        setUploadDate(uploadDate);

        const startDate = new Date(uploadData[0].startDate);
        setStartDate(startDate);

        // Calculate age and quotes per month for each tweet        // Calculate age and quotes per month for each tweet
        const tweetsWithAge = data
          .filter((tweet) => tweet.tweet_text !== "Tweet not found")
          .map((tweet) => {
            const tweetDate = new Date(tweet.created_at);
            const monthsSince =
              (uploadDate.getFullYear() - tweetDate.getFullYear()) * 12 +
              (uploadDate.getMonth() - tweetDate.getMonth());
            const quotesPerMonth = tweet.count / monthsSince;

            return {
              ...tweet,
              monthsSince,
              quotesPerMonth,
            };
          });

        // Get top 1000 tweets based on either total quotes or normalized quotes
        const topTweets = tweetsWithAge
          .filter((tweet) => tweet.monthsSince >= 3)
          .sort((a, b) =>
            showNormalized
              ? b.quotesPerMonth - a.quotesPerMonth
              : b.count - a.count
          )
          .slice(0, 1000);

        setTweets(topTweets);
        updateTimeData(topTweets, viewMode);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading tweet data:", error);
        setLoading(false);
      });
  }, [viewMode, showNormalized]); // Added showNormalized as dependency

  const updateTimeData = (tweetData, mode) => {
    const counts = tweetData.reduce((acc, tweet) => {
      const date = new Date(tweet.created_at);
      let key;

      if (mode === "year") {
        key = date.getFullYear().toString();
      } else {
        key = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
      }

      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    setTimeData(counts);
    setSelectedPeriod(null);
    setFilteredTweets([]);
  };

  const handleViewChange = (mode) => {
    setViewMode(mode);
    updateTimeData(tweets, mode);
  };

  const handlePeriodClick = (period) => {
    setSelectedPeriod(period);

    const filtered = tweets.filter((tweet) => {
      const date = new Date(tweet.created_at);
      if (viewMode === "year") {
        return date.getFullYear().toString() === period;
      } else {
        const tweetPeriod = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        return tweetPeriod === period;
      }
    });

    setFilteredTweets(filtered);
  };

  const downloadCSV = () => {
    const csvData = tweets.map((tweet) => ({
      tweet_text: tweet.tweet_text,
      tweet_url: `https://www.x.com/visakanv/status/${tweet.tweet_id}`,
      quote_count: tweet.count,
      created_date: new Date(tweet.created_at).toLocaleDateString(),
      year_created: new Date(tweet.created_at).getFullYear(),
      month_created: new Date(tweet.created_at).toLocaleDateString("en-US", {
        month: "long",
      }),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "top_quoted_tweets.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  const formatLabel = (label) => {
    if (viewMode === "month") {
      const [year, month] = label.split("-");
      return new Date(`${year}-${month}-01`).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });
    }
    return label;
  };

  const chartData = {
    labels: Object.keys(timeData)
      .sort()
      .map((key) => {
        if (viewMode === "month") {
          const [year, month] = key.split("-");
          return new Date(year, month - 1).getTime();
        }
        return new Date(key, 0).getTime();
      }),
    datasets: [
      {
        label: viewMode === "year" ? "Tweets per Year" : "Tweets per Month",
        data: Object.keys(timeData)
          .sort()
          .map((key) => timeData[key]),
        backgroundColor: Object.keys(timeData)
          .sort()
          .map((key) =>
            key === selectedPeriod
              ? "rgba(59, 130, 246, 0.6)" // Blue highlight for selected period
              : "rgba(75, 192, 192, 0.6)"
          ),
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: "index",
      intersect: false,
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const period = Object.keys(timeData).sort()[index];
        handlePeriodClick(period);
      }
    },
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text:
          viewMode === "year" ? "Yearly Tweet Count" : "Monthly Tweet Count",
      },
      tooltip: {
        callbacks: {
          title: (context) => {
            // Format date based on viewMode
            return new Date(context[0].parsed.x).toLocaleDateString("en-US", {
              year: "numeric",
              month: viewMode === "month" ? "long" : undefined,
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
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 20,
        },
        suggestedMax: Math.ceil(Math.max(...Object.values(timeData)) / 10) * 10,
      },
      x: {
        type: "time",
        time: {
          unit: viewMode === "year" ? "year" : "month",
          displayFormats: {
            year: "yyyy",
            month: "MMM yyyy",
          },
        },
        min:
          viewMode === "year"
            ? new Date(startDate.getFullYear(), 0).getTime()
            : new Date(startDate.getFullYear(), startDate.getMonth()).getTime(),
        max:
          viewMode === "year"
            ? new Date(uploadDate.getFullYear(), 11, 31).getTime()
            : new Date(
                uploadDate.getFullYear(),
                uploadDate.getMonth() + 1,
                0
              ).getTime(),
        ticks: {
          autoSkip: viewMode === "month",
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {showNormalized
            ? "Top 1000 Tweets (Normalized by Age)"
            : "Top 1000 Quoted Tweets"}
        </h1>
        <div className="space-x-2">
          <button
            onClick={() => handleViewChange("year")}
            className={`px-4 py-2 rounded ${
              viewMode === "year"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Yearly
          </button>
          <button
            onClick={() => handleViewChange("month")}
            className={`px-4 py-2 rounded ${
              viewMode === "month"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setShowNormalized(!showNormalized)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            {showNormalized ? "Regular View" : "Normalize by Age"}
          </button>
          <button
            onClick={downloadCSV}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <Bar data={chartData} options={chartOptions} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-4 py-2 bg-gray-50">
                  {viewMode === "year" ? "Year" : "Month"}
                </th>
                <th className="px-4 py-2 bg-gray-50">Number of Tweets</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(timeData)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([time, count]) => (
                  <tr
                    key={time}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      selectedPeriod === time ? "bg-blue-50" : ""
                    }`}
                    onClick={() => handlePeriodClick(time)}
                  >
                    <td className="border px-4 py-2">{formatLabel(time)}</td>
                    <td className="border px-4 py-2">{count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {selectedPeriod
                ? `Tweets from ${formatLabel(selectedPeriod)}`
                : "Select a period to see tweets"}
            </h2>
            {selectedPeriod && (
              <div className="flex items-center space-x-2">
                <select
                  value={tweetSortBy}
                  onChange={(e) => setTweetSortBy(e.target.value)}
                  className="px-2 py-2 border rounded bg-white text-sm"
                >
                  <option value="date">Sort by Date</option>
                  <option value="quotes">Sort by Quotes</option>
                </select>
                <button
                  onClick={() =>
                    setTweetSortDirection(
                      tweetSortDirection === "asc" ? "desc" : "asc"
                    )
                  }
                  className="px-3 py-2 border rounded hover:bg-gray-100"
                  title={
                    tweetSortDirection === "asc"
                      ? "Sort Descending"
                      : "Sort Ascending"
                  }
                >
                  {tweetSortDirection === "asc" ? "↓" : "↑"}
                </button>
              </div>
            )}
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {filteredTweets
              .sort((a, b) => {
                switch (tweetSortBy) {
                  case "date":
                    return tweetSortDirection === "asc"
                      ? new Date(a.created_at) - new Date(b.created_at)
                      : new Date(b.created_at) - new Date(a.created_at);
                  case "quotes":
                    return tweetSortDirection === "asc"
                      ? a.count - b.count
                      : b.count - a.count;
                  default:
                    return 0;
                }
              })
              .map((tweet) => (
                <div key={tweet.tweet_id} className="border-b pb-4">
                  <p className="text-sm text-gray-500 mb-1">
                    {showNormalized
                      ? `${tweet.count} quotes (${tweet.quotesPerMonth.toFixed(
                          1
                        )} per month)`
                      : `Quoted ${tweet.count} times`}{" "}
                    • Created on{" "}
                    {new Date(tweet.created_at).toLocaleDateString("en-US", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    (
                    {Math.floor(
                      (new Date(uploadDate) - new Date(tweet.created_at)) /
                        (30 * 24 * 60 * 60 * 1000)
                    )}{" "}
                    months ago)
                  </p>
                  <p className="mb-2">{tweet.tweet_text}</p>
                  <a
                    href={`https://twitter.com/visakanv/status/${tweet.tweet_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 text-sm"
                  >
                    View on Twitter →
                  </a>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TemporalAnalysis;
