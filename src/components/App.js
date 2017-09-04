import firebase from 'firebase';
import React from 'react';
import styled from 'styled-components';

import ChallengeImportForm from './ChallengeImportForm';
import ChallengeList from './ChallengeList';
import Header from './Header';
import request from '../utils/request';

const Content = styled.main`
  margin: 0 auto;
  max-width: 45rem;
  padding-top: 2rem;
`;

export default class App extends React.Component {
  state = {
    challenges: [],
    url: '',
    user: null,
  };

  setUser(user) { // eslint-disable-line react/sort-comp
    if (/umich\.edu$/i.test(user.email)) {
      const { displayName, email, photoURL, uid } = user;
      this.setState({
        user: { displayName, email, photoURL, uid },
      });
    } else {
      console.log('You must be part of the "umich.edu" domain to use this app.');
    }
  }

  componentDidMount() {
    this.challengesRef = firebase.database().ref('challenges');
    this.challengesRef.on('value', (snapshot) => {
      const challenges = snapshot.val() || {};
      this.setState({
        challenges: Object.values(challenges),
      });
    });

    this.auth = firebase.auth();
    this.auth.onAuthStateChanged((user) => {
      if (user) {
        this.setUser(user);
      }
    });
  }

  componentWillUnmount() {
    this.challengesRef.off();
  }

  async signIn() {
    try {
      const google = new firebase.auth.GoogleAuthProvider();
      const { user } = await this.auth.signInWithPopup(google);
      this.setUser(user);
    } catch (error) {
      console.log(error.message);
    }
  }

  async importChallenge() {
    try {
      const [, slug] = this.state.url.match(/codewars.com\/kata\/([^/]+)/i);
      const data = await request(`/codewars/code-challenges/${slug}`);
      if (!this.state.challenges.find(challenge => challenge.id === data.id)) {
        const { description, id, name, rank, tags, url } = data;
        const challenge = {
          createdAt: firebase.database.ServerValue.TIMESTAMP,
          description,
          id,
          name,
          points: rank.name,
          tags,
          url,
        };
        this.challengesRef.push(challenge);
        this.setState({
          url: '',
        });
      }
    } catch (error) {
      console.log(error.message);
    }
  }

  handleSubmit = async (event) => {
    event.preventDefault();

    if (this.state.user) {
      this.importChallenge();
    } else {
      await this.signIn();
      if (this.state.user) {
        this.importChallenge();
      }
    }
  }

  handleChange = (event) => {
    this.setState({
      [event.target.name]: event.target.value,
    });
  }

  render() {
    return (
      <div>
        <Header />
        <Content>
          <ChallengeImportForm
            handleChange={this.handleChange}
            handleSubmit={this.handleSubmit}
            url={this.state.url}
          />
          <ChallengeList challenges={this.state.challenges} />
        </Content>
      </div>
    );
  }
}
