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
import PropTypes from "prop-types";

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

const ThreadMetricsSection = ({
  threadMetrics,
  activeMetric,
  selectedThread,
  handleThreadSelection,
  handleMetricChange,
}) => {
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

  // Helper function to render column header with optional arrow
  const renderColumnHeader = (title, metric) => {
    const highlighted = isHighlighted(metric);
    return (
      <th
        className={`px-2 py-2 text-left text-sm sm:text-base ${
          highlighted ? "sm:bg-blue-50" : ""
        }`}
      >
        <div className="flex items-center gap-[2px]">
          {title}
          {highlighted && <span className="sm:text-blue-500">↓</span>}
        </div>
      </th>
    );
  };

  // Add this function to determine which columns to show based on screen size
  const getVisibleColumns = () => {
    // Using window.innerWidth directly isn't ideal for React
    // Consider using a useMediaQuery hook or CSS approach instead
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      return {
        rank: true,
        firstTweet: true,
        [activeMetric.replace("by", "").toLowerCase()]: true, // Show only active metric column
        startDate: false,
        endDate: false,
        length: activeMetric === "byLength",
        likes: activeMetric === "byLikes",
        retweets: activeMetric === "byRetweets",
        duration: activeMetric === "byDuration",
      };
    }

    return {
      rank: true,
      firstTweet: true,
      length: true,
      likes: true,
      retweets: true,
      duration: true,
      startDate: true,
      endDate: true,
    };
  };

  // Add ref for the table container
  const tableContainerRef = useRef(null);
  const rowRefs = useRef({});

  // Add useEffect to handle scrolling when selected thread changes
  useEffect(() => {
    if (
      selectedThread &&
      rowRefs.current[selectedThread.id] &&
      tableContainerRef.current
    ) {
      const row = rowRefs.current[selectedThread.id];
      const container = tableContainerRef.current;

      const rowTop = row.offsetTop;
      const rowBottom = rowTop + row.offsetHeight;
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;

      // Only scroll if the row is not fully visible in the viewport
      const isRowVisible =
        rowTop >= containerTop && rowBottom <= containerBottom;

      if (!isRowVisible) {
        container.scrollTo({
          top: rowTop - container.clientHeight / 2,
          behavior: "smooth",
        });
      }
    }
  }, [selectedThread]);

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <h2 className="text-xl font-bold mb-4">Thread Metrics</h2>

      <div className="flex gap-2 mb-4 flex-wrap">
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

      <div
        ref={tableContainerRef}
        className="overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400"
      >
        <div className="pr-2 sm:pr-0 w-full table-auto">
          <table className="table-auto w-full">
            <thead className="bg-gray-200">
              <tr>
                {getVisibleColumns().rank && (
                  <th className="w-12 px-2 py-2 text-left text-sm sm:text-base">
                    Rank
                  </th>
                )}
                {getVisibleColumns().firstTweet && (
                  <th className="w-full sm:w-auto px-2 py-2 text-left text-sm sm:text-base">
                    First Tweet
                  </th>
                )}
                {getVisibleColumns().length &&
                  renderColumnHeader("Length", "length")}
                {getVisibleColumns().likes &&
                  renderColumnHeader("Likes", "likes")}
                {getVisibleColumns().retweets &&
                  renderColumnHeader("RTs", "retweets")}
                {getVisibleColumns().duration &&
                  renderColumnHeader("Duration", "duration")}
                {getVisibleColumns().startDate && (
                  <th className="hidden md:table-cell px-2 py-2 text-left text-sm sm:text-base">
                    Start
                  </th>
                )}
                {getVisibleColumns().endDate && (
                  <th className="hidden md:table-cell px-2 py-2 text-left text-sm sm:text-base">
                    End
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {threadMetrics[activeMetric].map((thread, index) => (
                <tr
                  key={thread.id}
                  ref={(el) => (rowRefs.current[thread.id] = el)}
                  className={`border-t text-sm text-gray-600 hover:bg-gray-100 cursor-pointer ${
                    selectedThread?.id === thread.id ? "bg-gray-100 " : ""
                  }`}
                  onClick={() => handleThreadSelection(thread)}
                >
                  {getVisibleColumns().rank && (
                    <td className="px-2 py-2">{index + 1}</td>
                  )}
                  {getVisibleColumns().firstTweet && (
                    <td className="px-2 py-2">
                      <div className="max-w-[150px] sm:max-w-sm">
                        <p className="text-xs sm:text-sm">
                          {thread.tweets[0].text}
                        </p>
                      </div>
                    </td>
                  )}
                  {getVisibleColumns().length && (
                    <td
                      className={`px-2 py-2 ${
                        isHighlighted("length") ? "sm:bg-blue-50" : ""
                      }`}
                    >
                      {thread.length.toLocaleString()}
                    </td>
                  )}
                  {getVisibleColumns().likes && (
                    <td
                      className={`px-2 py-2 ${
                        isHighlighted("likes") ? "sm:bg-blue-50" : ""
                      }`}
                    >
                      {thread.totalLikes.toLocaleString()}
                    </td>
                  )}
                  {getVisibleColumns().retweets && (
                    <td
                      className={`px-2 py-2 ${
                        isHighlighted("retweets") ? "sm:bg-blue-50" : ""
                      }`}
                    >
                      {thread.totalRetweets.toLocaleString()}
                    </td>
                  )}
                  {getVisibleColumns().duration && (
                    <td
                      className={`px-2 py-2 ${
                        isHighlighted("duration") ? "sm:bg-blue-50" : ""
                      }`}
                    >
                      {formatDuration(thread.duration)}
                    </td>
                  )}
                  {getVisibleColumns().startDate && (
                    <td className="hidden md:table-cell px-2 py-2">
                      {thread.startDate.toLocaleDateString()}
                    </td>
                  )}
                  {getVisibleColumns().endDate && (
                    <td className="hidden md:table-cell px-2 py-2">
                      {thread.endDate.toLocaleDateString()}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

ThreadMetricsSection.propTypes = {
  threadMetrics: PropTypes.shape({
    byLength: PropTypes.array.isRequired,
    byLikes: PropTypes.array.isRequired,
    byRetweets: PropTypes.array.isRequired,
    byDuration: PropTypes.array.isRequired,
  }).isRequired,
  activeMetric: PropTypes.string.isRequired,
  selectedThread: PropTypes.object,
  handleThreadSelection: PropTypes.func.isRequired,
  handleMetricChange: PropTypes.func.isRequired,
};

const ThreadDisplay = ({
  selectedThread,
  highlightedTweetId,
  setHighlightedTweetId,
}) => {
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

  const sortedTweets = selectedThread.tweets.sort((a, b) => a.order - b.order);

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
        className="max-h-[500px] md:max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400"
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
                <span className="text-xs sm:text-sm font-medium text-gray-500">
                  Tweet {tweet.order} of {sortedTweets.length}
                </span>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500">
                  <span>♥ {tweet.favorite_count}</span>
                  <span>🔄 {tweet.retweet_count}</span>
                </div>
              </div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs sm:text-sm text-gray-500">
                  Posted at: {new Date(tweet.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-gray-700 text-sm sm:text-base">{tweet.text}</p>
              <div className="mt-2 text-xs sm:text-sm text-gray-500">
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

ThreadDisplay.propTypes = {
  selectedThread: PropTypes.shape({
    id: PropTypes.string,
    tweets: PropTypes.arrayOf(
      PropTypes.shape({
        tweet_id: PropTypes.string.isRequired,
        text: PropTypes.string.isRequired,
        order: PropTypes.number.isRequired,
        created_at: PropTypes.string.isRequired,
        favorite_count: PropTypes.number.isRequired,
        retweet_count: PropTypes.number.isRequired,
      })
    ).isRequired,
    startDate: PropTypes.instanceOf(Date).isRequired,
    endDate: PropTypes.instanceOf(Date).isRequired,
  }),
  highlightedTweetId: PropTypes.string,
  setHighlightedTweetId: PropTypes.func.isRequired,
};

function ThreadDistribution() {
  const [loading, setLoading] = useState(true);
  const chartRef = useRef(null);
  const [threadMetrics, setThreadMetrics] = useState({
    byLength: [],
    byLikes: [],
    byRetweets: [],
    byDuration: [],
  });
  const [selectedThread, setSelectedThread] = useState(null);
  const [activeMetric, setActiveMetric] = useState("byLength");
  const [highlightedTweetId, setHighlightedTweetId] = useState(null);
  const [statistics, setStatistics] = useState({});

  useEffect(() => {
    Promise.all([
      fetch("/twitter_threads.json").then((res) => res.json()),
      fetch("/thread_statistics.json").then((res) => res.json()),
    ])
      .then(([threadData, statisticsData]) => {
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

        const longestThread = statisticsData.longest_thread;
        const averageThreadLength = statisticsData.average_thread_length;
        const totalThreads = statisticsData.total_threads;

        setStatistics({
          longestThread,
          averageThreadLength,
          totalThreads,
        });

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

  // Move these handlers to the main component
  const handleThreadSelection = (thread) => {
    setSelectedThread(thread);
  };

  const handleMetricChange = (metric) => {
    setActiveMetric(metric);
    setSelectedThread(threadMetrics[metric][0]);
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

  return (
    <div className="p-4">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">Top 100 Threads</h1>
            <p className="text-gray-600">
              Showing Visa&apos;s top threads and how they were created over
              time
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="text-sm font-medium text-gray-500">Total Threads</h3>
          <p className="text-2xl font-bold">
            {statistics.totalThreads.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="text-sm font-medium text-gray-500">Longest Thread</h3>
          <p className="text-2xl font-bold">
            {statistics.longestThread.length.toLocaleString()} tweets
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="text-sm font-medium text-gray-500">
            Average Thread Length
          </h3>
          <p className="text-2xl font-bold">
            {statistics.averageThreadLength.toFixed(1)} tweets
          </p>
        </div>
      </div>
      <ThreadMetricsSection
        threadMetrics={threadMetrics}
        activeMetric={activeMetric}
        selectedThread={selectedThread}
        handleThreadSelection={handleThreadSelection}
        handleMetricChange={handleMetricChange}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 md:gap-6">
        <div className="hidden md:block">
          <ThreadDisplay
            selectedThread={selectedThread}
            highlightedTweetId={highlightedTweetId}
            setHighlightedTweetId={setHighlightedTweetId}
          />
        </div>
        <div className="bg-white p-4 rounded-lg shadow mb-6 col-span-2">
          <div className="h-[300px] md:h-[600px]">
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
        <div className="block md:hidden">
          <ThreadDisplay
            selectedThread={selectedThread}
            highlightedTweetId={highlightedTweetId}
            setHighlightedTweetId={setHighlightedTweetId}
          />
        </div>
      </div>
    </div>
  );
}

export default ThreadDistribution;
