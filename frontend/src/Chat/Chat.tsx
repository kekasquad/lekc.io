import React from 'react';
import { Socket } from 'socket.io-client';
import { withRouter } from 'react-router';
import { History, Location } from 'history';
import ChatMessage from '../ChatMessage/ChatMessage';
import './Chat.css';
import { serverAddress } from '../constants';

interface Message {
    userName: string;
    text: string;
    date: string;
    isPresenterMessage: boolean;
}

interface IProps {
    socket: Socket;
    streamId: string;
    history: History;
    location: Location;
    match: any;
}

interface IState {
    userName: string;
    messages: Message[];
    messageInputText: string;
}

class Chat extends React.Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);

        this.state = {
            userName: '',
            messages: [],
            messageInputText: ''
        };

        fetch(`https://${serverAddress}/user`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
            .then(res => res.json())
            .then(res => {this.setState({ userName: res.user.login })})
            .catch(() => this.props.history.push('/login'));

        this.handleMessageInputChange = this.handleMessageInputChange.bind(this);
        this.handleEnterPress = this.handleEnterPress.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
    }

    componentDidMount() {
        this.props.socket.on('receiveChatMessage',
            (streamId: string, senderSocketId: string, userName: string, message: string, date: string) => {
                console.log('Message received', date);
                if (streamId !== this.props.streamId) { return; }
                console.log('Message received');

                this.setState({
                    messages: [
                        ...this.state.messages,
                        { userName, text: message, date, isPresenterMessage: senderSocketId === streamId }
                    ]
                });
            }
        );
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
        if (!this.state.messageInputText || !this.state.userName) { return; }
        console.log('Sending message');
        this.props.socket.emit(
            'sendChatMessage', this.props.streamId, this.state.userName, this.state.messageInputText
        );
        this.setState({ messageInputText: '' });
    }

    render() {
        return (
            <div className='Chat-component'>
                <div className='Chat-messages_block'>
                    { this.state.messages.length ?
                        this.state.messages.map((message: Message, index: number) => <ChatMessage key={index} {...message}/>) :
                        <p>Chat is empty...</p> }
                </div>
                <div className='Chat-input_block'>
                    <input type='text' maxLength={128}
                           value={this.state.messageInputText}
                           onChange={this.handleMessageInputChange} onKeyDown={this.handleEnterPress}/>
                    <button className='common_button'
                            onClick={this.sendMessage}
                            disabled={!this.state.messageInputText}>Send</button>
                </div>
            </div>
        );
    }
}

export default withRouter(Chat);