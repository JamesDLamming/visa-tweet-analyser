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
  const [highlightedTweetId, setHighlightedTweetId] = useState(null);

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

        <div className="overflow-auto max-h-[400px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
          <div className="pr-0">
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
            tweet_id: tweet.tweet_id,
          })),
          backgroundColor: sortedTweets.map((tweet) =>
            tweet.tweet_id === highlightedTweetId
              ? "rgb(239, 68, 68)"
              : "rgb(59, 130, 246)"
          ),
          pointRadius: sortedTweets.map((tweet) =>
            tweet.tweet_id === highlightedTweetId ? 8 : 6
          ),
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
        enabled: true,
        mode: "nearest",
        intersect: true,
        callbacks: {
          title: (context) =>
            `Tweet ${context[0].raw.order} \n ${context[0].raw.text}`,
          label: (context) => {
            const date = new Date(context.raw.x).toLocaleString();
            return `Posted: ${date}`;
          },
        },
      },

      title: {
        display: true,
        text: "Tweets In Thread Over Time",
      },
      zoom: {
        pan: {
          enabled: true,
          mode: "x",
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
            min: selectedThread?.startDate?.getTime(),
            max: selectedThread?.endDate?.getTime(),
          },
        },
      },
    },
    scales: {
      x: {
        type: "time",
        time: {
          displayFormats: {
            millisecond: "MMM d, HH:mm:ss.SSS",
            second: "MMM d, HH:mm:ss",
            minute: "MMM d, HH:mm",
            hour: "MMM d, HH:mm",
            day: "MMM d",
            week: "MMM d",
            month: "MMM yyyy",
            quarter: "MMM yyyy",
            year: "yyyy",
          },
        },
        title: {
          display: true,
          text: "Date Posted",
        },
      },
      y: {
        display: false,
        min: 0,
        max: 2,
      },
    },
    onHover: null,
    hover: {
      mode: "nearest",
      intersect: true,
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const dataPoint = elements[0].element.$context.raw;
        setHighlightedTweetId(dataPoint.tweet_id);
      }
    },
  };

  // Add new component to display thread tweets
  const ThreadDisplay = () => {
    const scrollContainerRef = useRef(null);
    const tweetRefs = useRef({});

    // Scroll effect for graph clicks
    useEffect(() => {
      if (highlightedTweetId && tweetRefs.current[highlightedTweetId]) {
        const tweetElement = tweetRefs.current[highlightedTweetId];
        const container = scrollContainerRef.current;

        // Get the current scroll position
        const currentScroll = container.scrollTop;

        // Get the element's position relative to the container
        const elementTop = tweetElement.offsetTop - container.offsetTop;

        // Only scroll if the element is not visible in the viewport
        const containerHeight = container.clientHeight;
        if (
          elementTop < currentScroll ||
          elementTop > currentScroll + containerHeight
        ) {
          container.scrollTo({
            top: elementTop - containerHeight / 2,
            behavior: "smooth",
          });
        }
      }
    }, [highlightedTweetId]);

    if (!selectedThread) return null;

    const sortedTweets = selectedThread.tweets.sort(
      (a, b) => a.order - b.order
    );

    return (
      <div className="bg-white p-4 pr-2 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Thread Details</h2>
          <div className="text-sm text-gray-500 pr-2">
            {selectedThread.startDate.toLocaleDateString()} -{" "}
            {selectedThread.endDate.toLocaleDateString()}
          </div>
        </div>

        {/* Key the scroll container to selectedThread.id to maintain scroll position */}
        <div
          key={selectedThread.id}
          ref={scrollContainerRef}
          className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400"
        >
          <div className="pr-2 space-y-4 ">
            {sortedTweets.map((tweet) => (
              <div
                key={tweet.tweet_id}
                ref={(el) => (tweetRefs.current[tweet.tweet_id] = el)}
                className={`p-4 rounded-lg ${
                  tweet.tweet_id === highlightedTweetId
                    ? "bg-blue-50"
                    : "bg-gray-50"
                } cursor-pointer transition-all`}
                onClick={() => setHighlightedTweetId(tweet.tweet_id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-gray-500">
                    Tweet {tweet.order} of {sortedTweets.length}
                  </span>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>♥ {tweet.favorite_count}</span>
                    <span>🔄 {tweet.retweet_count}</span>
                  </div>
                </div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-gray-500">
                    Posted at: {new Date(tweet.created_at).toLocaleString()}
                  </span>
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
        <div className="bg-white p-4 rounded-lg shadow mb-6 col-span-2">
          <div className="h-[600px] md:h-[600px]">
            <Line
              data={getThreadTimelineData()}
              options={timelineOptions}
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThreadDistribution;
