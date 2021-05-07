import React from 'react';
import './Notification.css';

interface IProps {
    type: 'info' | 'error' | 'success';
    show: boolean;
    text: string;
    onClick: () => void;
}
interface IState {}

export default class Notification extends React.Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);
    }

    render() {
        return (
            <div className='Notification-component' onClick={this.props.onClick}>
                <div className={
                    `Notification-message Notification-${this.props.type} Notification-${this.props.show ? 'show': 'hide'}`
                }>
                    { this.props.text }
                </div>
            </div>
        );
    }
}