import React from 'react';
import { Socket } from 'socket.io-client';
import ChatMessage from '../ChatMessage/ChatMessage';
import './Chat.css';
import { serverAddress } from '../constants';

interface Message {
    userName: string;
    text: string;
    date: string;
    avatar: string;
    isPresenterMessage: boolean;
}

interface IProps {
    socket: Socket;
    streamId: string;
    login: string;
    token: string;
    showNotification: (type: 'info' | 'error' | 'success', text: string, notificationTimeout?: number) => void;
}

interface IState {
    presenterUsername: string;
    messages: Message[];
    messageInputText: string;
}

export default class Chat extends React.Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);

        this.state = {
            presenterUsername: '',
            messages: [],
            messageInputText: ''
        };

        this.handleMessageInputChange = this.handleMessageInputChange.bind(this);
        this.handleEnterPress = this.handleEnterPress.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
    }

    componentDidMount() {
        fetch(`https://${serverAddress}/stream/${this.props.streamId}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.props.token}`
            }
        })
            .then(res => res.json())
            .then(res => {
                this.setState({ presenterUsername: res.presenter.login });
                this.props.socket.on('receiveChatMessage',
                    (streamId: string, senderSocketId: string, userName: string, message: string, date: string) => {
                        if (streamId !== this.props.streamId) { return; }

                        this.setState({
                            messages: [
                                ...this.state.messages,
                                {
                                    userName, text: message, date,
                                    avatar: `https://${serverAddress}/user/${userName}/avatar`,
                                    isPresenterMessage: userName === this.state.presenterUsername
                                }
                            ]
                        });
                    }
                );
            })
            .catch((error) => {
                console.log(error);
                this.props.showNotification('error', 'Failed to load chat');
            });
    }

    handleMessageInputChange(event: any): void {
        this.setState({ messageInputText: event.target.value });
    }

    handleEnterPress(event: any): void {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.sendMessage();
        }
    }

    sendMessage(): void {
        if (!this.state.messageInputText || !this.props.login) { return; }
        console.log('Sending message');
        this.props.socket.emit(
            'sendChatMessage', this.props.streamId, this.props.login, this.state.messageInputText
        );
        this.setState({ messageInputText: '' });
    }

    render() {
        return (
            <div className='Chat-component'>
                {this.state.presenterUsername ?
                    <div className='Chat-messages_block'>
                        { this.state.messages.length ?
                            this.state.messages.map((message: Message, index: number) => <ChatMessage key={index} {...message}/>) :
                            <p>Chat is empty...</p> }
                    </div> : ''
                }
                {this.state.presenterUsername ?
                    <div className='Chat-input_block'>
                        <input type='text' maxLength={128}
                               value={this.state.messageInputText}
                               onChange={this.handleMessageInputChange} onKeyDown={this.handleEnterPress}/>
                        <button className='common_button'
                                onClick={this.sendMessage}
                                disabled={!this.state.messageInputText}>Send</button>
                    </div> : ''
                }
            </div>
        );
    }
}
