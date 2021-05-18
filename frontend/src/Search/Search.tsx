import React from 'react'; 
import './Search.css';
import NavBar from '../NavBar/NavBar';
import viewersIcon from '../assets/viewers-icon.png';
import { serverAddress } from '../constants';
import { withRouter } from 'react-router';
import { History, Location } from 'history';

interface StreamItem {
    id: string;
    avatar: string;
    presenterName: string;
    presenterLogin: string;
    streamName: string;
    viewersCount: number;
}

interface IProps {
    history: History;
    location: Location;
    match: any;
    showNotification: (type: 'info' | 'error' | 'success', text: string, notificationTimeout?: number) => void;
    token: string;
    login: string;
}

interface IState {
    searchQuery?: string;
    isInitial?: boolean;
    isLoading?: boolean;
    searchResults: StreamItem[];
}

class Search extends React.Component<IProps, IState> {
    readonly TOP_STREAMS_COUNT = 6;

    constructor(props: IProps) {
        super(props);
        this.state = {
            searchQuery: '',
            isLoading: false,
            isInitial: true,
            searchResults: []
        };
        this.handleQueryInputChange = this.handleQueryInputChange.bind(this);
        this.onSearchClick = this.onSearchClick.bind(this);
        this.loading = this.loading.bind(this);
        this.streams = this.streams.bind(this);
    }

    componentDidMount() {
        this.setState({ isLoading: true });
        this.loadStreams(this.TOP_STREAMS_COUNT).then(() => {});
    }

    handleQueryInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
        this.setState({ searchQuery: event.target.value });
    }

    async loadStreams(limit?: number) {
        const headers: any = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        };

        this.setState({ isLoading: true });

        try {
            let streams: any[] = await (await fetch(
                `https://${serverAddress}/streams` +
                `${limit ? `?limit=${limit}` : ''}` +
                `${this.state.searchQuery ? `?search=${this.state.searchQuery}` : ''}`,
                { headers }
            )).json();

            streams = streams.map(stream => {
                return {
                    id: stream.id,
                    avatar: `https://${serverAddress}/user/${stream.presenter.login}/avatar`,
                    presenterName: stream.presenter.name,
                    presenterLogin: stream.presenter.login,
                    streamName: stream.name,
                    viewersCount: stream.viewersCount
                };
            });
            this.setState({
                isLoading: false,
                searchResults: streams
            });
        } catch (error) {
            this.props.showNotification('error', 'Failed to fetch search results');
        }
    }

    async onSearchClick() {
        this.setState({
            isInitial: false,
            searchResults: []
        });
        await this.loadStreams();
    }

    loading(): JSX.Element {
        return (
            <div className='Search-placeholder'>
                <h3>Loading...</h3>
            </div>
        );
    }

    streams(): JSX.Element {
        if (this.state.searchResults.length === 0) {
            return (
                <div className='Search-placeholder'>
                    <h3>No streams found :(</h3>
                </div>
            );
        }
        const streams = this.state.searchResults.map((item: StreamItem, index: number) =>
            <div key={index} className='Search-stream_item'
                 onClick={() => this.props.history.push(`/stream/${item.id}`)}>
                <div className='Search-stream_item-avatar'>
                    <img src={item.avatar} onError={event => {event.currentTarget.style.display = 'none'}}/>
                </div>
                <div className='Search-stream_item-stream_info_block'>
                    <div className='Search-stream_item-stream_name_block'>
                        <span title={item.presenterName}>{item.presenterName} @{item.presenterLogin}</span>
                        <h3 title={item.streamName}>{item.streamName}</h3>
                    </div>
                    <div className='Search-stream_item-viewers_count_block'>
                        <span>{item.viewersCount}</span>
                        <img className='Search-stream_item-viewers_icon' src={viewersIcon}/>
                    </div>
                </div>
            </div>
        );
        return (
            <div className='Search-stream_list'>{streams}</div>
        );
    }

    render(): JSX.Element {
        return (
            <div className='Search-component'>
                <NavBar currentTab={0} showNotification={this.props.showNotification} login={this.props.login}/>
                <div className='Search-search_container'>
                    <h2>Search by author or name</h2>
                    <div className='Search-search_input_block'>
                        <input type='text' value={this.state.searchQuery} size={70}
                               onChange={this.handleQueryInputChange}/>
                        <button className='common_button'
                                onClick={this.onSearchClick}
                                disabled={this.state.isLoading || !this.state.searchQuery}>Search</button>
                    </div>
                    <h4>{this.state.isLoading ? '' : (this.state.isInitial ? 'Top streams' : 'Search results')}</h4>
                </div>
                <div className='Search-search_results_container'>
                    {
                        this.state.isLoading ?
                        this.loading() :
                        this.streams()
                    }
                </div>
            </div>
        );
    }
}

export default withRouter(Search);