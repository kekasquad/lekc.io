import React from 'react'; 
import './Search.css';
import NavBar from '../NavBar/NavBar';
import viewersIcon from '../assets/viewers-icon.png';

interface StreamItem {
    avatar: string;
    presenterName: string;
    streamName: string;
    viewersCount: number
}

const searchResult: StreamItem[] = [
    { avatar: 'https://randomuser.me/api/portraits/women/24.jpg', presenterName: 'Loretta Snyder Loretta Snyder Loretta Snyder Loretta Snyder', streamName: 'Dancing', viewersCount: 3 },
    { avatar: 'https://randomuser.me/api/portraits/men/88.jpg', presenterName: 'Gordon Matthews', streamName: 'Just Chatting', viewersCount: 4421 },
    { avatar: 'https://randomuser.me/api/portraits/men/29.jpg', presenterName: 'Franklin Cook', streamName: 'Sunday vlog', viewersCount: 321 },
    { avatar: 'https://randomuser.me/api/portraits/women/40.jpg', presenterName: 'Pamela Stewart', streamName: 'Films', viewersCount: 412 },
    { avatar: 'https://randomuser.me/api/portraits/women/50.jpg', presenterName: 'Terri Peterson', streamName: 'WWWWWWWWWWWWWWWWWWWWWWWWWW WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', viewersCount: 421 },
    { avatar: 'https://randomuser.me/api/portraits/women/61.jpg', presenterName: 'Hilda Reynolds', streamName: 'Watching The International 3 replays Watching The International 3 replays Watching The International 3 replays', viewersCount: 12 },
    { avatar: 'https://randomuser.me/api/portraits/women/24.jpg', presenterName: 'Loretta Snyder', streamName: 'Sample name', viewersCount: 3 },
    { avatar: 'https://randomuser.me/api/portraits/men/88.jpg', presenterName: 'Gordon Matthews', streamName: 'Rocket League Grand Champion', viewersCount: 4421 },
    { avatar: 'https://randomuser.me/api/portraits/men/29.jpg', presenterName: 'Franklin Cook', streamName: 'Studying Python together', viewersCount: 321 },
    { avatar: 'https://randomuser.me/api/portraits/women/40.jpg', presenterName: 'Pamela Stewart', streamName: 'Python sucks', viewersCount: 412 },
    { avatar: 'https://randomuser.me/api/portraits/women/50.jpg', presenterName: 'Terri Peterson', streamName: 'Raquel is talking', viewersCount: 421 },
    { avatar: 'https://randomuser.me/api/portraits/women/61.jpg', presenterName: 'Hilda Reynolds', streamName: 'Hilda #2', viewersCount: 12 }
];

interface IProps {
    showNotification: (type: 'info' | 'error' | 'success', text: string, notificationTimeout?: number) => void;
}

interface IState {
    searchQuery?: string;
    isInitial?: boolean;
    isLoading?: boolean;
    errorLoading?: Error;
    data: StreamItem[];
}

export default class Search extends React.Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);
        this.state = {
            searchQuery: '',
            isLoading: false,
            isInitial: true,
            errorLoading: undefined,
            data: []
        };
        this.handleQueryInputChange = this.handleQueryInputChange.bind(this);
    }

    handleQueryInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
        this.setState({ searchQuery: event.target.value });
    }

    onSearchClick() {
        this.setState({
            isLoading: true,
            isInitial: false,
            errorLoading: undefined,
            data: []
        });
        setTimeout(() => { 
            this.setState({
                isLoading: false,
                errorLoading: undefined,
                data: searchResult
            });
        }, 2000);
    }

    loading(): JSX.Element {
        return (
            <div>
                loading...
            </div>
        );
    }

    error(): JSX.Element {
        return (
            <div>
                error
            </div>
        );
    }

    streams(): JSX.Element {
        const streams = this.state.data.map((item: StreamItem, index: number) =>
            <div key={index} className='Search-stream_item'>
                <img src={item.avatar} className='Search-stream_item-avatar'/>
                <div className='Search-stream_item-stream_info_block'>
                    <div className='Search-stream_item-stream_name_block'>
                        <span title={item.presenterName}>{item.presenterName}</span>
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
            <div className='Search-stream_list'>
                {streams}
            </div>
        );
    }

    render(): JSX.Element {
        return (
            <div className='Search-component'>
                <NavBar currentTab={0} showNotification={this.props.showNotification}/>
                <div className='Search-search_container'>
                    <h2>Search by author or name</h2>
                    <div className='Search-search_input_block'>
                        <input type='text' value={this.state.searchQuery}
                               onChange={this.handleQueryInputChange}/>
                        <button className='common_button' onClick={ () => this.onSearchClick() }>Search</button>
                    </div>
                </div>
                <div className='Search-search_results_container'>
                    {/*{ */}
                    {/*    this.state.isLoading === true ? this.loading() : */}
                    {/*        this.state.errorLoading !== undefined ? this.error() : */}
                    {/*        this.state.isInitial ? <div/> : this.streams() */}
                    {/*}*/}
                    {this.streams()}
                </div>
            </div>
        );
    }

}
