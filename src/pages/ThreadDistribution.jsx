import { useState, useEffect, useRef } from "react";
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
import zoomPlugin from "chartjs-plugin-zoom";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin
);

const exportQuotesToCSV = (tweet, quotes) => {
  if (!quotes || quotes.length === 0) return;

  // Prepare CSV headers and data
  const headers = [
    "Quote Tweet ID",
    "Quote Text",
    "Created At",
    "Likes",
    "Retweets",
    "In Reply To",
    "Quote Tweet URL",
  ];

  // Sort quotes by creation date (earliest to latest)
  const sortedQuotes = [...quotes].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  const rows = sortedQuotes.map((quote) => {
    return [
      quote.tweet_id,
      `"${quote.text.replace(/"/g, '""')}"`, // Escape quotes in text
      quote.created_at.toISOString(),
      quote.favorite_count,
      quote.retweet_count,
      quote.in_reply_to || "",
      `https://twitter.com/visakanv/status/${quote.tweet_id}`,
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  // Create and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `quotes_for_tweet_${tweet.tweet_id}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

function ThreadDistribution() {
  const [loading, setLoading] = useState(true);
  const [topTweets, setTopTweets] = useState([]);
  const [selectedTweet, setSelectedTweet] = useState(null);
  const [uploadDate, setUploadDate] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [quoteData, setQuoteData] = useState({});
  const [showMonthly, setShowMonthly] = useState(false);
  const [showNormalized, setShowNormalized] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [collapseAll, setCollapseAll] = useState(false);
  const [earliestTweetDate, setEarliestTweetDate] = useState(null);
  const [sortBy, setSortBy] = useState("quotes");
  const [sortDirection, setSortDirection] = useState("asc");
  const chartRef = useRef(null);
  const [isTweetSelectorExpanded, setIsTweetSelectorExpanded] = useState(false);
  const [threads, setThreads] = useState([]);
  const [threadMetrics, setThreadMetrics] = useState({
    byLength: [],
    byLikes: [],
    byRetweets: [],
    byDuration: [],
  });
  const [selectedThread, setSelectedThread] = useState(null);
  const [activeMetric, setActiveMetric] = useState("byLength");

  useEffect(() => {
    Promise.all([
      fetch("/upload.json").then((res) => res.json()),
      fetch("/twitter_threads.json").then((res) => res.json()),
    ])
      .then(([uploadData, threadData]) => {
        const uploadDate = new Date(uploadData[0].endDate);
        setUploadDate(uploadDate);

        const startDate = new Date(uploadData[0].startDate);
        setStartDate(startDate);

        const processedThreads = Object.entries(threadData).map(
          ([id, thread]) => {
            const startDate = new Date(thread.metadata.start_date);
            const endDate = new Date(thread.metadata.end_date);
            const durationMinutes = (endDate - startDate) / (1000 * 60);

            return {
              id,
              length: thread.metadata.length,
              totalLikes: thread.metadata.total_likes,
              totalRetweets: thread.metadata.total_retweets,
              duration: durationMinutes,
              startDate,
              endDate,
              tweets: thread.tweets,
            };
          }
        );

        // Sort threads by different metrics
        const metrics = {
          byLength: [...processedThreads]
            .sort((a, b) => b.length - a.length)
            .slice(0, 100),
          byLikes: [...processedThreads]
            .sort((a, b) => b.totalLikes - a.totalLikes)
            .slice(0, 100),
          byRetweets: [...processedThreads]
            .sort((a, b) => b.totalRetweets - a.totalRetweets)
            .slice(0, 100),
          byDuration: [...processedThreads]
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 100),
        };

        setThreads(processedThreads);
        setThreadMetrics(metrics);
        // Set the first thread from byLength as selected by default
        setSelectedThread(metrics.byLength[0]);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading data:", error);
        setLoading(false);
      });
  }, []);

  // // Add effect to handle sorting of displayed tweets
  // useEffect(() => {
  //   if (!loading) {
  //     const newTop100 = getTop100Tweets(topTweets, showNormalized);
  //     setTopTweets(newTop100);
  //     if (!newTop100.find((t) => t.tweet_id === selectedTweet?.tweet_id)) {
  //       setSelectedTweet(newTop100[0]);
  //     }
  //   }
  // }, [showNormalized, sortBy]);

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

  const getChartData = (tweet) => {
    if (!tweet) return null;

    // Create array of months between tweet creation and upload date
    const months = [];
    const currentDate = new Date(tweet.created_at);
    while (currentDate <= uploadDate) {
      months.push(currentDate.toISOString().slice(0, 7));
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Get monthly quote counts
    const monthlyQuotes = months.map(
      (month) => tweet.quotesByMonth[month] || 0
    );

    // Calculate data based on monthly vs cumulative view
    let cumSum = 0;
    const data = monthlyQuotes.map((count) => {
      if (!showMonthly) {
        cumSum += count;
        return cumSum;
      }
      return count;
    });

    return {
      labels: months.map((month) => new Date(month)),
      datasets: [
        {
          label: getChartLabel(),
          data: data,
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.5)",
          fill: true,
        },
      ],
    };
  };

  const getChartLabel = () => {
    if (showMonthly) {
      return "Quotes per Month";
    }
    return "Total Quotes";
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Quote Distribution Over Time",
      },
      tooltip: {
        callbacks: {
          title: (context) => {
            // Format the date as "MMM DD, YYYY"
            return new Date(context[0].parsed.x).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
            });
          },
          label: (context) => {
            const value = context.parsed.y.toFixed(showNormalized ? 2 : 0);
            return `${getChartLabel()}: ${value}`;
          },
        },
      },
      zoom: {
        pan: {
          enabled: true,
          mode: "x",
          modifierKey: "ctrl",
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          mode: "x",
          drag: {
            enabled: true,
            backgroundColor: "rgba(59, 130, 246, 0.3)",
          },
        },
        limits: {
          x: {
            min: earliestTweetDate?.getTime(),
            max: uploadDate?.getTime(),
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
            year: "yyyy",
            month: "MMM yyyy",
          },
        },
        min: earliestTweetDate ? earliestTweetDate.getTime() : undefined,
        max: new Date(
          uploadDate.getFullYear(),
          uploadDate.getMonth() + 1,
          0
        ).getTime(),
        title: {
          display: true,
          text: "Date",
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: getChartLabel(),
        },
      },
    },
  };

  // Add this helper function
  const getMonthsSince = (date1, date2) => {
    return (
      (date2.getFullYear() - date1.getFullYear()) * 12 +
      (date2.getMonth() - date1.getMonth())
    );
  };

  // Add this function to handle row selection
  const handleThreadSelection = (thread) => {
    setSelectedThread(thread);
  };

  const ThreadMetricsSection = () => {
    const metricLabels = {
      byLength: "Longest Threads",
      byLikes: "Most Liked Threads",
      byRetweets: "Most Retweeted Threads",
      byDuration: "Longest Duration Threads",
    };

    const formatDuration = (minutes) => {
      if (minutes < 1) return "less than a day";
      if (minutes < 1440) return `${Math.round(minutes / 60)} hours`;
      const days = Math.floor(minutes / 1440);
      const remainingHours = Math.round((minutes % 1440) / 60);
      return `${days}d ${remainingHours}h`;
    };

    // Helper function to determine if a column should be highlighted
    const isHighlighted = (metric) => {
      const highlights = {
        byLength: "length",
        byLikes: "likes",
        byRetweets: "retweets",
        byDuration: "duration",
      };
      return highlights[activeMetric] === metric;
    };

    // Update metric change handler to also update selected thread
    const handleMetricChange = (metric) => {
      setActiveMetric(metric);
      // Set the first thread of the new metric as selected
      setSelectedThread(threadMetrics[metric][0]);
    };

    // Helper function to render column header with optional arrow
    const renderColumnHeader = (title, metric) => {
      const highlighted = isHighlighted(metric);
      return (
        <th
          className={`px-2 py-2 text-left ${highlighted ? "bg-blue-50" : ""}`}
        >
          <div className="flex items-center gap-[2px]">
            {title}
            {highlighted && <span className="text-blue-500">↓</span>}
          </div>
        </th>
      );
    };

    return (
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-xl font-bold mb-4">Thread Metrics</h2>

        <div className="flex gap-2 mb-4">
          {Object.entries(metricLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleMetricChange(key)}
              className={`px-4 py-2 rounded ${
                key === activeMetric
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-auto max-h-[400px]">
          <table className="min-w-full">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-2 py-2 text-left">Rank</th>
                <th className="px-2 py-2 text-left">Thread - First Tweet</th>
                {renderColumnHeader("Thread Length", "length")}
                {renderColumnHeader("Total Likes", "likes")}
                {renderColumnHeader("Total Retweets", "retweets")}
                {renderColumnHeader("Duration", "duration")}
                <th className="px-2 py-2 text-left">Start Date</th>
                <th className="px-2 py-2 text-left">End Date</th>
              </tr>
            </thead>
            <tbody>
              {threadMetrics[activeMetric].map((thread, index) => (
                <tr
                  key={thread.id}
                  className={`border-t text-sm text-gray-600 hover:bg-gray-100 cursor-pointer ${
                    selectedThread?.id === thread.id ? "bg-gray-100 " : ""
                  }`}
                  onClick={() => handleThreadSelection(thread)}
                >
                  <td className="px-2 py-2">{index + 1}</td>
                  <td className="px-2 py-2">
                    <div className="max-w-sm">
                      <p className="truncate">{thread.tweets[0].text}</p>
                    </div>
                  </td>
                  <td
                    className={`px-2 py-2 ${
                      isHighlighted("length") ? "bg-blue-50" : ""
                    }`}
                  >
                    {thread.length.toLocaleString()} tweets
                  </td>
                  <td
                    className={`px-2 py-2 ${
                      isHighlighted("likes") ? "bg-blue-50" : ""
                    }`}
                  >
                    {thread.totalLikes.toLocaleString()} likes
                  </td>
                  <td
                    className={`px-2 py-2 ${
                      isHighlighted("retweets") ? "bg-blue-50" : ""
                    }`}
                  >
                    {thread.totalRetweets.toLocaleString()} retweets
                  </td>
                  <td
                    className={`px-2 py-2 ${
                      isHighlighted("duration") ? "bg-blue-50" : ""
                    }`}
                  >
                    {formatDuration(thread.duration)}
                  </td>
                  <td className="px-2 py-2">
                    {thread.startDate.toLocaleDateString()}
                  </td>
                  <td className="px-2 py-2">
                    {thread.endDate.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const getThreadTimelineData = () => {
    const sortedTweets = [...selectedThread.tweets].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    return {
      datasets: [
        {
          label: "Thread Posts",
          data: sortedTweets.map((tweet) => ({
            x: new Date(tweet.created_at),
            y: 1,
            order: tweet.order,
            text: tweet.text,
          })),
          backgroundColor: "rgb(59, 130, 246)",
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    };
  };

  const timelineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          title: (context) => `Tweet ${context[0].raw.order}`,
          label: (context) => {
            const date = new Date(context.raw.x).toLocaleString();
            return `Posted: ${date}`;
          },
        },
      },
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        type: "time",
        time: {
          unit: "minute",
        },
        title: {
          display: true,
          text: "Time",
        },
      },
      y: {
        display: false,
        min: 0,
        max: 2,
      },
    },
  };

  // Add new component to display thread tweets
  const ThreadDisplay = () => {
    if (!selectedThread) return null;

    return (
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Thread Details</h2>
          <div className="text-sm text-gray-500">
            {selectedThread.startDate.toLocaleDateString()} -{" "}
            {selectedThread.endDate.toLocaleDateString()}
          </div>
        </div>

        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {selectedThread.tweets
            .sort((a, b) => a.order - b.order)
            .map((tweet, index) => (
              <div
                key={tweet.tweet_id}
                className={`p-4 rounded-lg ${
                  index === 0 ? "bg-blue-50" : "bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-gray-500">
                    Tweet {tweet.order} of {selectedThread.tweets.length}
                  </span>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>♥ {tweet.favorite_count}</span>
                    <span>🔄 {tweet.retweet_count}</span>
                  </div>
                </div>
                <p className="text-gray-700">{tweet.text}</p>
                <div className="mt-2 text-sm text-gray-500">
                  <a
                    href={`https://twitter.com/visakanv/status/${tweet.tweet_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600"
                  >
                    View →
                  </a>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">Top 100 Threads</h1>
            <p className="text-gray-600">
              Showing Visa's top threads and how they were created over time
            </p>
          </div>
        </div>
      </div>
      <ThreadMetricsSection />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ThreadDisplay />
        {/* <Line data={getThreadTimelineData()} options={timelineOptions} /> */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-4 rounded-lg shadow">
          {selectedTweet && (
            <>
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold mb-2">
                    Thread Distribution
                  </h2>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <h3 className="text-sm font-medium text-gray-500">
                      Total Quotes
                    </h3>
                    <p className="text-2xl font-bold">
                      {quoteData[
                        selectedTweet.tweet_id
                      ]?.length.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <h3 className="text-sm font-medium text-gray-500">
                      Most Active Month
                    </h3>
                    <p className="text-2xl font-bold">
                      {Object.entries(selectedTweet.quotesByMonth)
                        .sort(([, a], [, b]) => b - a)[0]?.[0]
                        ?.split("-")
                        .map((part, i) =>
                          i === 1
                            ? new Date(2000, part - 1).toLocaleString(
                                "default",
                                { month: "short" }
                              )
                            : part
                        )
                        .join(" ") || "N/A"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {Object.entries(selectedTweet.quotesByMonth)
                        .sort(([, a], [, b]) => b - a)[0]?.[1]
                        .toLocaleString() || 0}{" "}
                      quotes
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <h3 className="text-sm font-medium text-gray-500">
                      Average per Month
                    </h3>
                    <p className="text-2xl font-bold">
                      {(
                        (quoteData[selectedTweet.tweet_id]?.length || 0) /
                        Object.keys(selectedTweet.quotesByMonth).length
                      ).toFixed(1)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 bg-gray-50 p-4 rounded">
                  <p className="text-gray-600">{selectedTweet.tweet_text}</p>

                  <div className="text-sm text-gray-500 mt-1 flex gap-4">
                    <span>
                      {selectedTweet.created_at.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span>♥ {selectedTweet.favorite_count}</span>
                    <span>🔄 {selectedTweet.retweet_count}</span>
                    {selectedTweet.in_reply_to && (
                      <span>↩️ Reply to @{selectedTweet.in_reply_to}</span>
                    )}
                    <a
                      href={`https://twitter.com/visakanv/status/${selectedTweet.tweet_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600"
                    >
                      View on Twitter →
                    </a>
                  </div>
                </div>
              </div>
              <div className="h-[300px] md:h-[350px]">
                <Line
                  data={getChartData(selectedTweet)}
                  options={chartOptions}
                  ref={chartRef}
                />
              </div>
              <div className="mt-2 text-center flex justify-center gap-4">
                <button
                  onClick={() => {
                    const chart = chartRef.current;
                    if (chart) {
                      chart.resetZoom();
                    }
                  }}
                  className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Reset Zoom
                </button>
                <button
                  onClick={() => setShowMonthly(!showMonthly)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
                >
                  {showMonthly ? "Show Cumulative" : "Show Monthly"}
                </button>
              </div>
              {selectedTweet && quoteData[selectedTweet.tweet_id] && (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Quoting Tweets</h3>
                    <div className="flex gap-2">
                      {quoteData[selectedTweet.tweet_id] &&
                        quoteData[selectedTweet.tweet_id].length > 0 && (
                          <button
                            onClick={() =>
                              exportQuotesToCSV(
                                selectedTweet,
                                quoteData[selectedTweet.tweet_id]
                              )
                            }
                            className="text-sm text-blue-500 hover:text-blue-600 px-3 py-1 border rounded"
                          >
                            Export CSV
                          </button>
                        )}
                      <button
                        onClick={toggleAllGroups}
                        className="text-sm text-blue-500 hover:text-blue-600"
                      >
                        {collapseAll ? "Expand All" : "Collapse All"}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {Object.entries(
                      quoteData[selectedTweet.tweet_id].reduce((acc, quote) => {
                        const monthsAfter = getMonthsSince(
                          selectedTweet.created_at,
                          quote.created_at
                        );
                        if (!acc[monthsAfter]) {
                          acc[monthsAfter] = [];
                        }
                        acc[monthsAfter].push(quote);
                        return acc;
                      }, {})
                    )
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([monthsAfter, quotes]) => (
                        <div
                          key={monthsAfter}
                          className="border rounded-lg overflow-hidden"
                        >
                          <button
                            onClick={() => toggleGroup(monthsAfter)}
                            className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 flex justify-between items-center text-left"
                          >
                            <h4 className="font-medium text-gray-700">
                              {monthsAfter === "0"
                                ? "First Month"
                                : `${monthsAfter} Month${
                                    Number(monthsAfter) === 1 ? "" : "s"
                                  } After`}
                              <span className="text-sm font-normal text-gray-500 ml-2">
                                ({quotes.length} quote
                                {quotes.length === 1 ? "" : "s"})
                              </span>
                            </h4>
                            <span className="text-gray-400">
                              {collapsedGroups.has(monthsAfter) ? "+" : "−"}
                            </span>
                          </button>
                          {!collapsedGroups.has(monthsAfter) && (
                            <div className="space-y-3 p-4">
                              {quotes
                                .sort((a, b) => a.created_at - b.created_at)
                                .map((quote) => (
                                  <div
                                    key={quote.tweet_id}
                                    className="border-l border-gray-200 pl-4"
                                  >
                                    <p className="text-sm">{quote.text}</p>
                                    <div className="text-xs text-gray-500 mt-1 flex gap-4">
                                      <span>
                                        {quote.created_at.toLocaleDateString(
                                          "en-US",
                                          {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                          }
                                        )}
                                      </span>
                                      <span>♥ {quote.favorite_count}</span>
                                      <span>🔄 {quote.retweet_count}</span>
                                      {quote.in_reply_to && (
                                        <span>
                                          ↩️ Reply to @{quote.in_reply_to}
                                        </span>
                                      )}
                                      <a
                                        href={`https://twitter.com/visakanv/status/${quote.tweet_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:text-blue-600"
                                      >
                                        View on Twitter →
                                      </a>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ThreadDistribution;
