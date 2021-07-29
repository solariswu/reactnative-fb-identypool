// @flow
import React, {Component} from 'react';
import {StyleSheet, Text, View, Button} from 'react-native';

//facebook login
import {
  LoginButton,
  AccessToken,
  GraphRequest,
  GraphRequestManager,
} from 'react-native-fbsdk-next';

//Amplify
import {Auth} from '@aws-amplify/auth';
import {API} from '@aws-amplify/api';
import {graphqlOperation} from '@aws-amplify/api-graphql';
import {updateMycounter} from './src/graphql/mutations';
import {listMycounters} from './src/graphql/queries';

export default class App extends Component {
  state = {
    userInfo: {},
    isSignedIn: false,
    userID: null,
    error: null,
    counter: null,
  };

  getInfoFromToken = token => {
    const PROFILE_REQUEST_PARAMS = {
      fields: {
        string: 'id, name,  first_name, last_name',
      },
    };
    const profileRequest = new GraphRequest(
      '/me',
      {token, parameters: PROFILE_REQUEST_PARAMS},
      (error, result) => {
        if (error) {
          this.setState({error});
          console.log('login info has error: ' + error);
        } else {
          this.setState({userInfo: result});
          console.log('result:', result);
        }
      },
    );
    new GraphRequestManager().addRequest(profileRequest).start();
  };

  async _increaseCounter() {
    try {
      let counter = this.state.counter;
      counter.value = counter.value + 1;
      this.setState({counter});
      await API.graphql(graphqlOperation(updateMycounter, {input: counter}));
    } catch (err) {
      console.log('error increasing counter', err);
    }
  }

  async _getCounter() {
    try {
      const counterData = await API.graphql(graphqlOperation(listMycounters));
      console.log('counterData', counterData);
      const counterItem = counterData.data.listMycounters.items[0];
      const counter = {id: counterItem.id, value: counterItem.value};
      this.setState({counter});
    } catch (err) {
      console.log('error fetching counter', err);
    }
  }

  postLogin = () => {
    console.log('enter post login');
    AccessToken.getCurrentAccessToken().then(data => {
      if (data) {
        const accessToken = data.accessToken.toString();
        this.getInfoFromToken(accessToken);
        this._updateCredential(data.accessToken, data.userID).then(() => {
          this._getCounter();
        });
      } else {
        console.log('Not log in');
      }
    });
  };

  async componentDidMount() {
    console.log('AT object :', AccessToken);

    if (AccessToken) {
      this.postLogin();
    }
  }

  async _updateCredential(token, userID) {
    console.log('update currentCred...');
    return Auth.federatedSignIn(
      'facebook',
      {
        token,
      },
      userID,
    );
  }

  renderError() {
    const {error} = this.state;
    console.log('err:', error);
    if (!error) {
      return null;
    }
    const text = `${error.toString()} ${error.code ? error.code : ''}`;
    return <Text>{text}</Text>;
  }

  renderCounterButton() {
    return (
      <Button
        onPress={async () => {
          await this._increaseCounter();
        }}
        title="increase counter"
      />
    );
  }

  renderCounter() {
    return (
      <View style={styles.container}>
        <Text>
          Counter {this.state.counter ? this.state.counter.value : '...'}
        </Text>
        <Text>{this.state.counter ? this.renderCounterButton() : ''}</Text>
      </View>
    );
  }

  renderFb() {
    return (
      <View>
        {this.state.userInfo.name && (
          <Text style={{fontSize: 16, marginVertical: 16}}>
            Logged in As {this.state.userInfo.name}
          </Text>
        )}
        <LoginButton
          onLoginFinished={(error, result) => {
            if (error) {
              this.setState({error,});
              console.log('login has error: ' + result.error);
            } else if (result.isCancelled) {
              this.setState({error: {code: 'Login cancelled'}});
              console.log('login is cancelled.');
            } else {
              AccessToken.getCurrentAccessToken().then(data => {
                const accessToken = data.accessToken.toString();
                this.getInfoFromToken(accessToken);
                this._updateCredential(data.accessToken, data.userID).then(
                  () => {
                    this._getCounter();
                  },
                );
              });
            }
          }}
          loginBehaviorAndroid="native_with_fallback"
          onLogoutFinished={() => {
            Auth.signOut();
            Auth.Credentials.clear();
            this.setState({userInfo: {}, counter: null, error: null});
          }}
        />
        {this.renderError()}
      </View>
    );
  }
  render() {
    return (
      <View style={[styles.container, styles.pageContainer]}>
        {this.renderCounter()}
        {this.renderFb()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  userInfo: {fontSize: 18, fontWeight: 'bold', marginBottom: 20},
  pageContainer: {flex: 1},
});
