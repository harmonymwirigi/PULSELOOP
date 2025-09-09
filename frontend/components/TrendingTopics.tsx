import React, { useState, useEffect, useCallback } from 'react';
import { getTrendingTopics, TrendingTopic, TrendingTopicsResponse } from '../services/mockApi';
import Spinner from './Spinner';

interface TrendingTopicsProps {
    onTagClick: (tag: string) => void;
    className?: string;
}

const TrendingTopics: React.FC<TrendingTopicsProps> = ({ onTagClick, className = '' }) => {
    const [trendingData, setTrendingData] = useState<TrendingTopicsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d'>('24h');

    const fetchTrendingTopics = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getTrendingTopics(10, selectedPeriod);
            setTrendingData(data);
        } catch (err) {
            setError('Failed to fetch trending topics.');
        } finally {
            setLoading(false);
        }
    }, [selectedPeriod]);

    useEffect(() => {
        fetchTrendingTopics();
    }, [fetchTrendingTopics]);

    const getPeriodLabel = (period: string) => {
        switch (period) {
            case '24h': return '24 Hours';
            case '7d': return '7 Days';
            case '30d': return '30 Days';
            default: return '24 Hours';
        }
    };

    const getTrendingIcon = (index: number) => {
        if (index === 0) return '🔥'; // Fire for #1
        if (index === 1) return '⚡'; // Lightning for #2
        if (index === 2) return '💫'; // Star for #3
        return '📈'; // Chart for others
    };

    const getTrendingColor = (index: number) => {
        if (index === 0) return 'text-red-600 bg-red-50 border-red-200';
        if (index === 1) return 'text-orange-600 bg-orange-50 border-orange-200';
        if (index === 2) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-teal-600 bg-teal-50 border-teal-200';
    };

    if (loading) {
        return (
            <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
                <div className="flex items-center justify-center h-32">
                    <Spinner size="md" color="teal" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
                <p className="text-red-500 text-center">{error}</p>
            </div>
        );
    }

    if (!trendingData || trendingData.trending_topics.length === 0) {
        return (
            <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">📈</span>
                    Trending Topics
                </h3>
                <p className="text-gray-500 text-center">No trending topics found for this period.</p>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <span className="mr-2">📈</span>
                    Trending Topics
                </h3>
                <div className="flex space-x-1">
                    {(['24h', '7d', '30d'] as const).map((period) => (
                        <button
                            key={period}
                            onClick={() => setSelectedPeriod(period)}
                            className={`px-2 py-1 text-xs rounded-md transition-colors ${
                                selectedPeriod === period
                                    ? 'bg-teal-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {period}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                {trendingData.trending_topics.map((topic, index) => (
                    <div
                        key={topic.tag}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm cursor-pointer ${getTrendingColor(index)}`}
                        onClick={() => onTagClick(topic.tag)}
                    >
                        <div className="flex items-center space-x-3">
                            <span className="text-lg">{getTrendingIcon(index)}</span>
                            <div>
                                <span className="font-medium text-sm">#{topic.tag}</span>
                                <div className="flex items-center space-x-2 text-xs opacity-75">
                                    <span>{topic.post_count} posts</span>
                                    <span>•</span>
                                    <span>{topic.comment_count} comments</span>
                                    <span>•</span>
                                    <span>{topic.reaction_count} reactions</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-medium opacity-75">
                                Score: {Math.round(topic.score)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                    Based on activity in the last {getPeriodLabel(selectedPeriod).toLowerCase()}
                </p>
            </div>
        </div>
    );
};

export default TrendingTopics;
