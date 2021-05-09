import React from 'react';
import './ChatMessage.css';

interface IProps {
    userName: string;
    text: string;
    date: string;
    avatar: string;
    isPresenterMessage: boolean;
}

interface IState {
    [key: string]: any;
}

export default class ChatMessage extends React.Component<IProps, IState> {
    render() {
        const date: Date = new Date(this.props.date);
        return (
            <div className='ChatMessage-component'>
                <div className='ChatMessage-component_krujochek'>
                    <img src={this.props.avatar}/>
                </div>
                <div className={'ChatMessage-component_message' + (this.props.isPresenterMessage ? ' presenter_message' : '')}>
                    <div className='ChatMessage-username_block'>
                        <h5>{(this.props.isPresenterMessage ? '👑 ' : '') + this.props.userName}</h5>
                    </div>
                    <div className='ChatMessage-text_block'>
                        <p>{this.props.text}</p>
                    </div>
                    <div className='ChatMessage-date_block'>
                        <span>
                            {`${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`}
                        </span>
                    </div>
                </div>
            </div>
        );
    }
}