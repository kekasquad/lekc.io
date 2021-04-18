import React from 'react';
import { Socket } from 'socket.io-client';
import ChatMessage from '../ChatMessage/ChatMessage';
import './Chat.css';

interface Message {
    userName: string;
    text: string;
    date: string;
    isPresenterMessage: boolean;
}

interface IProps {
    socket: Socket;
    streamId: string;
}

interface IState {
    messages: Message[];
    messageInputText: string;
    userName: string;
}

export default class Chat extends React.Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);

        this.state = {
            messages: [],
            messageInputText: '',
            userName: ''
        };

        this.handleMessageInputChange = this.handleMessageInputChange.bind(this);
        this.handleUserNameInputChange = this.handleUserNameInputChange.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
    }

    componentDidMount() {
        this.props.socket.on('receiveChatMessage',
            (streamId: string, userName: string, message: string, date: string) => {
                console.log('Message received', date);
                if (streamId !== this.props.streamId) { return; }
                console.log('Message received');

                this.setState({
                    messages: [
                        ...this.state.messages,
                        { userName, text: message, date, isPresenterMessage: this.props.socket.id === streamId }
                    ]
                });
            }
        );
    }

    handleMessageInputChange(event: any): void {
        this.setState({ messageInputText: event.target.value });
    }

    handleUserNameInputChange(event: any): void {
        this.setState({ userName: event.target.value });
    }

    sendMessage(): void {
        if (!this.state.messageInputText || !this.state.userName) { return; }
        console.log('Sending message');
        this.props.socket.emit(
            'sendChatMessage', this.props.streamId, this.state.userName, this.state.messageInputText
        );
    }

    render() {
        return (
            <div className='Chat-component'>
                <div className='Chat-messages_block'>
                    { this.state.messages.map((message: Message) => <ChatMessage {...message}/>) }
                </div>
                <div className='Chat-input_block'>
                    <input type='text' size={30} maxLength={128}
                           value={this.state.messageInputText}
                           onChange={this.handleMessageInputChange}/>
                    <button className='common_button'
                            onClick={this.sendMessage}
                            disabled={!this.state.messageInputText}>Send</button>
                </div>
                <div className='Chat-username_block'>
                    <span>Username: </span>
                    <input type='text' size={30} maxLength={128}
                           value={this.state.userName}
                           onChange={this.handleUserNameInputChange}/>
                </div>
            </div>
        );
    }
}