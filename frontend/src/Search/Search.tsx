import React from 'react'; 
import './Search.css';

const searchResult = [
    { avatar: "https://randomuser.me/api/portraits/women/24.jpg", name: "Loretta Snyder", views: 3 },
    { avatar: "https://randomuser.me/api/portraits/men/88.jpg", name: "Gordon Matthews", views: 4421 },
    { avatar: "https://randomuser.me/api/portraits/men/29.jpg", name: "Franklin Cook", views: 321 },
    { avatar: "https://randomuser.me/api/portraits/women/40.jpg", name: "Pamela Stewart", views: 412 },
    { avatar: "https://randomuser.me/api/portraits/women/50.jpg", name: "Terri Peterson", views: 421 },
    { avatar: "https://randomuser.me/api/portraits/women/61.jpg", name: "Hilda Reynolds", views: 12 }
];

interface Streamer {
    avatar?: string;
    name?: string;
    views?: number
}

interface IProps {}

interface IState {
    searchQuery?: string;
    isLoading?: boolean;
    errorLoading?: Error;
    data: Streamer[];
}

export default class Search extends React.Component<IProps, IState> {

    constructor(props: any) {
        super(props);
        this.state = {
            searchQuery: '',
            isLoading: false,
            errorLoading: undefined,
            data: []
        };
        this.handleInputChange = this.handleInputChange.bind(this);
    }

    handleInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
        this.setState({ 
            searchQuery: event.target.value 
        });
    }

    onSearchClick() {
        this.setState({
            isLoading: true,
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
        const streams = this.state.data.map((item: any, index: number) =>
            <div key={index} className="item_stream">
                <img src={item.avatar} />
                {item.name}
            </div>
        );
        return (
            <div className="item_list">
                { "Found " + this.state.data.length + " " + (this.state.data.length === 1 ? "stream" : "streams") }
                {streams}
            </div>
        );
    }

    render(): JSX.Element {
        return (
            <div className="window">
                <div className="search_container">
                    Search by author or name
                    <input type='text' name='searchQuery'
                        value={this.state.searchQuery}
                        onChange={this.handleInputChange}/>
                    <button className='search_btn text_btn' onClick={ () => this.onSearchClick() }>Search</button>
                </div>
                <div className="search_results_container">
                    { this.state.isLoading === true ? this.loading() : this.state.errorLoading !== undefined ? this.error() : this.streams() }
                </div>
            </div>
        );
    }

}
